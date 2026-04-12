package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/frankly-bautista/sistema-de-comedor/image-processor-go/internal/config"
	"github.com/frankly-bautista/sistema-de-comedor/image-processor-go/internal/grpcserver"
	"github.com/frankly-bautista/sistema-de-comedor/image-processor-go/internal/images"
	"github.com/frankly-bautista/sistema-de-comedor/image-processor-go/internal/logger"
	"github.com/frankly-bautista/sistema-de-comedor/image-processor-go/internal/staticserver"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(fmt.Errorf("load config: %w", err))
	}

	log := logger.New(cfg.ServiceName, cfg.LogLevel)
	if err := run(log, cfg); err != nil {
		log.Error("service stopped with error", slog.Any("error", err))
		os.Exit(1)
	}
}

func run(log *slog.Logger, cfg config.Config) error {
	storage := images.NewStorage(cfg.StorageRoot, cfg.PublicPathPrefix)
	processor := images.NewService(images.ServiceConfig{
		SourceBasePath:     cfg.SourceBasePath,
		VariantConcurrency: cfg.VariantConcurrency,
	}, storage, log)

	grpcSrv := grpcserver.New(log, processor)
	httpSrv := staticserver.New(log, staticserver.Config{
		Address:          cfg.HTTPAddress,
		StorageRoot:      cfg.StorageRoot,
		PublicPathPrefix: cfg.PublicPathPrefix,
	})

	grpcListener, err := net.Listen("tcp", cfg.GRPCAddress)
	if err != nil {
		return fmt.Errorf("listen grpc: %w", err)
	}
	defer grpcListener.Close()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 2)

	go func() {
		log.Info("grpc server listening", slog.String("address", cfg.GRPCAddress))
		if serveErr := grpcSrv.Serve(grpcListener); serveErr != nil {
			errCh <- fmt.Errorf("grpc server: %w", serveErr)
		}
	}()

	go func() {
		log.Info("http static server listening",
			slog.String("address", cfg.HTTPAddress),
			slog.String("public_path_prefix", cfg.PublicPathPrefix),
			slog.String("storage_root", cfg.StorageRoot),
		)
		if serveErr := httpSrv.ListenAndServe(); serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			errCh <- fmt.Errorf("http static server: %w", serveErr)
		}
	}()

	select {
	case <-ctx.Done():
		log.Info("shutdown signal received")
	case err := <-errCh:
		stop()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		shutdown(shutdownCtx, log, grpcSrv, httpSrv)
		return err
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	shutdown(shutdownCtx, log, grpcSrv, httpSrv)
	return nil
}

func shutdown(ctx context.Context, log *slog.Logger, grpcSrv interface {
	GracefulStop()
	Stop()
}, httpSrv *http.Server) {
	done := make(chan struct{})

	go func() {
		defer close(done)
		grpcSrv.GracefulStop()
	}()

	select {
	case <-done:
		log.Info("grpc server stopped gracefully")
	case <-ctx.Done():
		log.Warn("forcing grpc shutdown", slog.Any("error", ctx.Err()))
		grpcSrv.Stop()
	}

	if err := httpSrv.Shutdown(ctx); err != nil && !errors.Is(err, context.Canceled) {
		log.Warn("http shutdown returned error", slog.Any("error", err))
		return
	}

	log.Info("http server stopped gracefully")
}
