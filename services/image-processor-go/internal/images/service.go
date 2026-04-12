package images

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"github.com/h2non/bimg"

	pb "github.com/frankly-bautista/sistema-de-comedor/image-processor-go/proto/generated"
)

type ServiceConfig struct {
	SourceBasePath     string
	VariantConcurrency int
}

type Service struct {
	sourceBasePath     string
	variantConcurrency int
	storage            *Storage
	logger             *slog.Logger
}

type normalizedVariant struct {
	name    string
	width   int
	height  int
	quality int
	format  string
}

func NewService(cfg ServiceConfig, storage *Storage, logger *slog.Logger) *Service {
	workers := cfg.VariantConcurrency
	if workers <= 0 {
		workers = runtime.GOMAXPROCS(0)
	}
	if workers <= 0 {
		workers = 1
	}

	return &Service{
		sourceBasePath:     strings.TrimSpace(cfg.SourceBasePath),
		variantConcurrency: workers,
		storage:            storage,
		logger:             logger,
	}
}

func (s *Service) Process(ctx context.Context, req *pb.ProcessImageRequest) (*pb.ProcessImageResponse, error) {
	if err := validateRequest(req); err != nil {
		return nil, err
	}

	sourcePath, err := s.resolveSourcePath(req.GetSourcePath())
	if err != nil {
		return nil, err
	}

	sourceBytes, err := os.ReadFile(sourcePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, NewError(CodeSourceNotFound, fmt.Sprintf("source file %q does not exist", sourcePath), err)
		}
		return nil, NewError(CodeInternal, "read source file", err)
	}

	if _, err := bimg.NewImage(sourceBytes).Size(); err != nil {
		return nil, NewError(CodeInvalidFormat, fmt.Sprintf("source file %q is not a supported image", sourcePath), err)
	}

	response := &pb.ProcessImageResponse{
		ImageId:  req.GetImageId(),
		Variants: make([]*pb.ProcessedVariant, len(req.GetVariants())),
	}

	groupCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	sem := make(chan struct{}, s.variantConcurrency)
	errCh := make(chan error, len(req.GetVariants()))
	var wg sync.WaitGroup

	for idx, rawVariant := range req.GetVariants() {
		idx, rawVariant := idx, rawVariant

		wg.Add(1)
		go func() {
			defer wg.Done()

			select {
			case sem <- struct{}{}:
			case <-groupCtx.Done():
				return
			}
			defer func() {
				<-sem
			}()

			processedVariant, err := s.processVariant(groupCtx, req.GetImageId(), sourceBytes, rawVariant)
			if err != nil {
				select {
				case errCh <- err:
					cancel()
				default:
				}
				return
			}

			response.Variants[idx] = processedVariant
		}()
	}

	wg.Wait()
	close(errCh)

	if err, ok := <-errCh; ok {
		return nil, err
	}

	s.logger.Info("image processed",
		slog.String("image_id", req.GetImageId()),
		slog.Int("variant_count", len(response.Variants)),
	)

	return response, nil
}

func (s *Service) processVariant(
	ctx context.Context,
	imageID string,
	sourceBytes []byte,
	variant *pb.VariantSpec,
) (*pb.ProcessedVariant, error) {
	select {
	case <-ctx.Done():
		return nil, NewError(CodeInternal, "request context cancelled", ctx.Err())
	default:
	}

	normalized, err := normalizeVariant(variant)
	if err != nil {
		return nil, err
	}

	options := bimg.Options{
		Width:         normalized.width,
		Height:        normalized.height,
		Quality:       normalized.quality,
		Type:          bimg.WEBP,
		StripMetadata: true,
		Enlarge:       false,
	}

	processedBytes, err := bimg.NewImage(sourceBytes).Process(options)
	if err != nil {
		return nil, NewError(CodeProcessFailed, fmt.Sprintf("process variant %q", normalized.name), err)
	}

	dimensions, err := bimg.NewImage(processedBytes).Size()
	if err != nil {
		return nil, NewError(CodeProcessFailed, fmt.Sprintf("inspect variant %q", normalized.name), err)
	}

	outputPath, err := s.storage.SaveVariant(imageID, normalized.name, normalized.format, processedBytes)
	if err != nil {
		return nil, err
	}

	return &pb.ProcessedVariant{
		Name:       normalized.name,
		OutputPath: outputPath,
		Width:      uint32(dimensions.Width),
		Height:     uint32(dimensions.Height),
		SizeBytes:  uint64(len(processedBytes)),
		Format:     normalized.format,
	}, nil
}

func validateRequest(req *pb.ProcessImageRequest) error {
	if req == nil {
		return NewError(CodeInvalidRequest, "request cannot be nil", nil)
	}

	if strings.TrimSpace(req.GetImageId()) == "" {
		return NewError(CodeInvalidRequest, "image_id is required", nil)
	}

	if _, err := sanitizeSegment(req.GetImageId()); err != nil {
		return NewError(CodeInvalidRequest, "image_id contains unsupported characters", err)
	}

	if strings.TrimSpace(req.GetSourcePath()) == "" {
		return NewError(CodeInvalidRequest, "source_path is required", nil)
	}

	if len(req.GetVariants()) == 0 {
		return NewError(CodeInvalidRequest, "at least one variant is required", nil)
	}

	for idx, variant := range req.GetVariants() {
		if _, err := normalizeVariant(variant); err != nil {
			return NewError(CodeInvalidRequest, fmt.Sprintf("variant[%d] is invalid", idx), err)
		}
	}

	return nil
}

func normalizeVariant(variant *pb.VariantSpec) (normalizedVariant, error) {
	if variant == nil {
		return normalizedVariant{}, NewError(CodeInvalidRequest, "variant cannot be nil", nil)
	}

	name, err := sanitizeSegment(variant.GetName())
	if err != nil {
		return normalizedVariant{}, NewError(CodeInvalidRequest, "variant name contains unsupported characters", err)
	}

	if variant.GetWidth() == 0 && variant.GetHeight() == 0 {
		return normalizedVariant{}, NewError(CodeInvalidRequest, "variant width or height must be greater than zero", nil)
	}

	quality := int(variant.GetQuality())
	if quality == 0 {
		quality = 82
	}
	if quality < 1 || quality > 100 {
		return normalizedVariant{}, NewError(CodeInvalidRequest, "variant quality must be between 1 and 100", nil)
	}

	format := strings.ToLower(strings.TrimSpace(variant.GetFormat()))
	if format == "" {
		format = "webp"
	}
	if format != "webp" {
		return normalizedVariant{}, NewError(CodeInvalidFormat, fmt.Sprintf("format %q is not supported", variant.GetFormat()), nil)
	}

	return normalizedVariant{
		name:    name,
		width:   int(variant.GetWidth()),
		height:  int(variant.GetHeight()),
		quality: quality,
		format:  format,
	}, nil
}

func (s *Service) resolveSourcePath(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", NewError(CodeInvalidRequest, "source_path is required", nil)
	}

	if s.sourceBasePath == "" {
		return filepath.Clean(raw), nil
	}

	baseAbs, err := filepath.Abs(s.sourceBasePath)
	if err != nil {
		return "", NewError(CodeInternal, "resolve SOURCE_BASE_PATH", err)
	}

	var resolved string
	if filepath.IsAbs(raw) {
		resolved = filepath.Clean(raw)
	} else {
		resolved = filepath.Join(baseAbs, raw)
	}

	resolvedAbs, err := filepath.Abs(resolved)
	if err != nil {
		return "", NewError(CodeInternal, "resolve source_path", err)
	}

	rel, err := filepath.Rel(baseAbs, resolvedAbs)
	if err != nil {
		return "", NewError(CodeInternal, "compare source_path with SOURCE_BASE_PATH", err)
	}

	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", NewError(CodeInvalidRequest, "source_path escapes SOURCE_BASE_PATH", nil)
	}

	return resolvedAbs, nil
}
