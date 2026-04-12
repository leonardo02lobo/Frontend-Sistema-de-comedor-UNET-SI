FROM golang:1.24-bookworm AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    gcc \
    libvips-dev \
    pkg-config \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/image-processor ./main.go

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libvips \
 && rm -rf /var/lib/apt/lists/*

RUN groupadd --system appuser && useradd --system --gid appuser --uid 10001 appuser

WORKDIR /app

ENV SERVICE_NAME=image-processor-go \
    GRPC_ADDRESS=:50051 \
    HTTP_ADDRESS=:8080 \
    IMAGE_STORAGE_ROOT=/data/images \
    SOURCE_BASE_PATH=/data/source \
    PUBLIC_PATH_PREFIX=/images \
    LOG_LEVEL=INFO \
    VARIANT_CONCURRENCY=4

RUN mkdir -p /data/images /data/source && chown -R appuser:appuser /data

COPY --from=builder /out/image-processor /usr/local/bin/image-processor

USER appuser

VOLUME ["/data/images", "/data/source"]
EXPOSE 50051 8080

ENTRYPOINT ["/usr/local/bin/image-processor"]
