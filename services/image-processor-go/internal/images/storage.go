package images

import (
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
)

type Storage struct {
	root             string
	publicPathPrefix string
}

func NewStorage(root, publicPathPrefix string) *Storage {
	return &Storage{
		root:             filepath.Clean(root),
		publicPathPrefix: cleanPublicPathPrefix(publicPathPrefix),
	}
}

func (s *Storage) SaveVariant(imageID, variantName, format string, data []byte) (string, error) {
	safeImageID, err := sanitizeSegment(imageID)
	if err != nil {
		return "", NewError(CodeInvalidRequest, "invalid image_id", err)
	}

	safeVariant, err := sanitizeSegment(variantName)
	if err != nil {
		return "", NewError(CodeInvalidRequest, "invalid variant name", err)
	}

	safeFormat := strings.ToLower(strings.TrimSpace(format))
	if safeFormat != "webp" {
		return "", NewError(CodeInvalidFormat, fmt.Sprintf("unsupported output format %q", format), nil)
	}

	targetDir := filepath.Join(s.root, safeImageID)
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return "", NewError(CodeSaveFailed, "create target directory", err)
	}

	fileName := safeVariant + "." + safeFormat
	targetPath := filepath.Join(targetDir, fileName)

	tmpFile, err := os.CreateTemp(targetDir, fileName+".*.tmp")
	if err != nil {
		return "", NewError(CodeSaveFailed, "create temporary target file", err)
	}

	tmpPath := tmpFile.Name()
	cleanup := true
	defer func() {
		if cleanup {
			_ = os.Remove(tmpPath)
		}
	}()

	if _, err := tmpFile.Write(data); err != nil {
		_ = tmpFile.Close()
		return "", NewError(CodeSaveFailed, "write temporary target file", err)
	}

	if err := tmpFile.Chmod(0o644); err != nil {
		_ = tmpFile.Close()
		return "", NewError(CodeSaveFailed, "set permissions on target file", err)
	}

	if err := tmpFile.Close(); err != nil {
		return "", NewError(CodeSaveFailed, "close temporary target file", err)
	}

	if err := os.Rename(tmpPath, targetPath); err != nil {
		return "", NewError(CodeSaveFailed, "promote temporary target file", err)
	}

	cleanup = false
	return path.Join(s.publicPathPrefix, safeImageID, fileName), nil
}

func cleanPublicPathPrefix(prefix string) string {
	prefix = strings.TrimSpace(prefix)
	if prefix == "" {
		return "/images"
	}

	if !strings.HasPrefix(prefix, "/") {
		prefix = "/" + prefix
	}

	return strings.TrimRight(prefix, "/")
}

func sanitizeSegment(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", fmt.Errorf("value cannot be empty")
	}

	for _, r := range value {
		if r >= 'a' && r <= 'z' {
			continue
		}
		if r >= 'A' && r <= 'Z' {
			continue
		}
		if r >= '0' && r <= '9' {
			continue
		}
		switch r {
		case '-', '_':
			continue
		default:
			return "", fmt.Errorf("unsupported character %q", r)
		}
	}

	return value, nil
}
