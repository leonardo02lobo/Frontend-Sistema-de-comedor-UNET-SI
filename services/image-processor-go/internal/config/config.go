package config

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

const (
	defaultServiceName       = "image-processor-go"
	defaultGRPCAddress       = ":50051"
	defaultHTTPAddress       = ":8080"
	defaultStorageRoot       = "/data/images"
	defaultPublicPathPrefix  = "/images"
	defaultLogLevel          = "INFO"
	defaultVariantWorkersMin = 1
)

type Config struct {
	ServiceName        string
	GRPCAddress        string
	HTTPAddress        string
	StorageRoot        string
	SourceBasePath     string
	PublicPathPrefix   string
	LogLevel           string
	VariantConcurrency int
}

func Load() (Config, error) {
	cfg := Config{
		ServiceName:        envOrDefault("SERVICE_NAME", defaultServiceName),
		GRPCAddress:        envOrDefault("GRPC_ADDRESS", defaultGRPCAddress),
		HTTPAddress:        envOrDefault("HTTP_ADDRESS", defaultHTTPAddress),
		StorageRoot:        filepath.Clean(envOrDefault("IMAGE_STORAGE_ROOT", defaultStorageRoot)),
		SourceBasePath:     strings.TrimSpace(os.Getenv("SOURCE_BASE_PATH")),
		PublicPathPrefix:   normalizePublicPathPrefix(envOrDefault("PUBLIC_PATH_PREFIX", defaultPublicPathPrefix)),
		LogLevel:           strings.ToUpper(envOrDefault("LOG_LEVEL", defaultLogLevel)),
		VariantConcurrency: defaultVariantConcurrency(),
	}

	if rawConcurrency := strings.TrimSpace(os.Getenv("VARIANT_CONCURRENCY")); rawConcurrency != "" {
		parsed, err := strconv.Atoi(rawConcurrency)
		if err != nil || parsed < defaultVariantWorkersMin {
			return Config{}, fmt.Errorf("invalid VARIANT_CONCURRENCY %q", rawConcurrency)
		}
		cfg.VariantConcurrency = parsed
	}

	if cfg.StorageRoot == "" {
		return Config{}, fmt.Errorf("IMAGE_STORAGE_ROOT cannot be empty")
	}

	if cfg.SourceBasePath != "" {
		cfg.SourceBasePath = filepath.Clean(cfg.SourceBasePath)
	}

	return cfg, nil
}

func envOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func defaultVariantConcurrency() int {
	if workers := runtime.GOMAXPROCS(0); workers > 0 {
		return workers
	}
	return defaultVariantWorkersMin
}

func normalizePublicPathPrefix(prefix string) string {
	prefix = strings.TrimSpace(prefix)
	if prefix == "" || prefix == "/" {
		return "/images"
	}

	if !strings.HasPrefix(prefix, "/") {
		prefix = "/" + prefix
	}

	if len(prefix) > 1 {
		prefix = strings.TrimRight(prefix, "/")
	}

	return prefix
}
