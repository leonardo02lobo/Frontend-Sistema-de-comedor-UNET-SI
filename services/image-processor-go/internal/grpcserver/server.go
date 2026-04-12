package grpcserver

import (
	"context"
	"fmt"
	"log/slog"
	"runtime/debug"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	grpcHealth "google.golang.org/grpc/health"
	grpcHealthV1 "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"

	"github.com/frankly-bautista/sistema-de-comedor/image-processor-go/internal/images"
	pb "github.com/frankly-bautista/sistema-de-comedor/image-processor-go/proto/generated"
)

type service struct {
	pb.UnimplementedImageProcessorServiceServer
	processor *images.Service
	logger    *slog.Logger
}

func New(logger *slog.Logger, processor *images.Service) *grpc.Server {
	server := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			recoveryInterceptor(logger),
			loggingInterceptor(logger),
		),
		grpc.MaxRecvMsgSize(64<<20),
		grpc.MaxSendMsgSize(64<<20),
	)

	pb.RegisterImageProcessorServiceServer(server, &service{
		processor: processor,
		logger:    logger,
	})

	healthServer := grpcHealth.NewServer()
	healthServer.SetServingStatus(pb.ImageProcessorService_ServiceDesc.ServiceName, grpcHealthV1.HealthCheckResponse_SERVING)
	grpcHealthV1.RegisterHealthServer(server, healthServer)
	reflection.Register(server)

	return server
}

func (s *service) ProcessImage(ctx context.Context, req *pb.ProcessImageRequest) (*pb.ProcessImageResponse, error) {
	response, err := s.processor.Process(ctx, req)
	if err != nil {
		imageID := ""
		if req != nil {
			imageID = req.GetImageId()
		}

		s.logger.Error("process image failed",
			slog.String("image_id", imageID),
			slog.Any("error", err),
		)
		return nil, toStatusError(err)
	}

	return response, nil
}

func toStatusError(err error) error {
	switch images.CodeOf(err) {
	case images.CodeInvalidRequest, images.CodeInvalidFormat:
		return status.Error(codes.InvalidArgument, err.Error())
	case images.CodeSourceNotFound:
		return status.Error(codes.NotFound, err.Error())
	case images.CodeProcessFailed, images.CodeSaveFailed:
		return status.Error(codes.Internal, err.Error())
	default:
		return status.Error(codes.Internal, "internal image processing error")
	}
}

func loggingInterceptor(logger *slog.Logger) grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req any,
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (any, error) {
		start := time.Now()
		resp, err := handler(ctx, req)
		duration := time.Since(start)

		if err != nil {
			logger.Error("grpc request failed",
				slog.String("method", info.FullMethod),
				slog.Duration("duration", duration),
				slog.Any("error", err),
			)
			return resp, err
		}

		logger.Info("grpc request completed",
			slog.String("method", info.FullMethod),
			slog.Duration("duration", duration),
		)
		return resp, nil
	}
}

func recoveryInterceptor(logger *slog.Logger) grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req any,
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (resp any, err error) {
		defer func() {
			if recovered := recover(); recovered != nil {
				logger.Error("panic recovered from grpc handler",
					slog.String("method", info.FullMethod),
					slog.Any("panic", recovered),
					slog.String("stacktrace", string(debug.Stack())),
				)
				err = status.Error(codes.Internal, fmt.Sprintf("panic recovered in %s", info.FullMethod))
			}
		}()

		return handler(ctx, req)
	}
}
