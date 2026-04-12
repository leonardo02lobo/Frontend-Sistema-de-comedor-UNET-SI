package staticserver

import (
	"errors"
	"log/slog"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"
)

type Config struct {
	Address          string
	StorageRoot      string
	PublicPathPrefix string
}

func New(logger *slog.Logger, cfg Config) *http.Server {
	root := filepath.Clean(cfg.StorageRoot)
	prefix := cleanPrefix(cfg.PublicPathPrefix)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	fileHandler := &fileHandler{
		root:   root,
		logger: logger,
	}

	mux.Handle(prefix+"/", http.StripPrefix(prefix, fileHandler))

	return &http.Server{
		Addr:              cfg.Address,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
}

type fileHandler struct {
	root   string
	logger *slog.Logger
}

func (h *fileHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	relativePath, ok := sanitizeRelativePath(r.URL.Path)
	if !ok {
		http.NotFound(w, r)
		return
	}

	targetPath := filepath.Join(h.root, filepath.FromSlash(relativePath))
	if !isWithinRoot(h.root, targetPath) {
		http.NotFound(w, r)
		return
	}

	file, err := os.Open(targetPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			http.NotFound(w, r)
			return
		}
		h.logger.Error("open static file failed",
			slog.String("path", targetPath),
			slog.Any("error", err),
		)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		h.logger.Error("stat static file failed",
			slog.String("path", targetPath),
			slog.Any("error", err),
		)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	if info.IsDir() {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeContent(w, r, info.Name(), info.ModTime(), file)
}

func sanitizeRelativePath(raw string) (string, bool) {
	cleaned := path.Clean("/" + strings.TrimSpace(raw))
	relative := strings.TrimPrefix(cleaned, "/")
	if relative == "" || relative == "." {
		return "", false
	}
	return relative, true
}

func cleanPrefix(prefix string) string {
	prefix = strings.TrimSpace(prefix)
	if prefix == "" || prefix == "/" {
		return "/images"
	}
	if !strings.HasPrefix(prefix, "/") {
		prefix = "/" + prefix
	}
	return strings.TrimRight(prefix, "/")
}

func isWithinRoot(root, target string) bool {
	root = filepath.Clean(root)
	target = filepath.Clean(target)

	rel, err := filepath.Rel(root, target)
	if err != nil {
		return false
	}

	return rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}
