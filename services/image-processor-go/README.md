# Image Processor Go

Microservicio en Go para procesamiento pesado de imagenes dentro de una arquitectura hibrida.

## Que hace

Este servicio se encarga unicamente de:

- recibir solicitudes internas por gRPC
- leer una imagen fuente desde un volumen o ruta compartida
- generar variantes optimizadas
- convertir las variantes a WebP
- comprimir y redimensionar imagenes con `bimg` + `libvips`
- guardar los archivos derivados en disco
- servir los archivos procesados por HTTP usando `net/http`

No implementa:

- autenticacion
- logica de negocio
- base de datos
- validaciones propias de la API publica

Esas responsabilidades siguen viviendo en Node.js + TypeScript.

## Como esta organizado

```text
services/image-processor-go/
├── main.go
├── internal/config
├── internal/grpcserver
├── internal/images
├── internal/logger
├── internal/staticserver
└── proto
```

Resumen por paquete:

- `internal/config`: carga configuracion desde variables de entorno
- `internal/grpcserver`: expone el servicio gRPC e interceptores
- `internal/images`: validacion tecnica, procesamiento y almacenamiento
- `internal/logger`: logger estructurado con `slog`
- `internal/staticserver`: sirve los archivos procesados por HTTP
- `proto`: contrato protobuf y codigo generado para gRPC

## Como funciona

El flujo es este:

1. Node.js envia una peticion gRPC con `image_id`, `source_path` y una lista de variantes.
2. Go valida tecnicamente el request y resuelve la ruta de la imagen original.
3. El servicio procesa cada variante en paralelo controlado.
4. Cada variante se convierte a WebP, se comprime y se redimensiona.
5. Los archivos resultantes se guardan en:

```text
<IMAGE_STORAGE_ROOT>/<image_id>/<variant>.webp
```

6. Go responde con metadata de salida:

- `image_id`
- `name`
- `output_path`
- `width`
- `height`
- `size_bytes`
- `format`

7. Luego esos archivos pueden consumirse por HTTP desde:

```text
<PUBLIC_PATH_PREFIX>/<image_id>/<variant>.webp
```

## Contrato gRPC

Entrada esperada:

```json
{
  "image_id": "demo_001",
  "source_path": "sample.jpg",
  "variants": [
    {
      "name": "thumbnail",
      "width": 200,
      "height": 200,
      "quality": 75,
      "format": "webp"
    }
  ]
}
```

Respuesta esperada:

```json
{
  "image_id": "demo_001",
  "variants": [
    {
      "name": "thumbnail",
      "output_path": "/images/demo_001/thumbnail.webp",
      "width": 200,
      "height": 200,
      "size_bytes": 12345,
      "format": "webp"
    }
  ]
}
```

## Errores manejados

El servicio devuelve errores claros para casos como:

- request invalido
- `source_path` inexistente
- formato de imagen no soportado
- fallo al procesar una variante
- fallo al guardar el archivo

Internamente esos errores se mapean a codigos gRPC como `InvalidArgument`, `NotFound` e `Internal`.

## Variables de entorno

- `SERVICE_NAME`: nombre del servicio
- `GRPC_ADDRESS`: puerto del servidor gRPC
- `HTTP_ADDRESS`: puerto del servidor HTTP
- `IMAGE_STORAGE_ROOT`: raiz donde se guardan las variantes
- `SOURCE_BASE_PATH`: raiz permitida para archivos fuente
- `PUBLIC_PATH_PREFIX`: prefijo HTTP para servir imagenes
- `LOG_LEVEL`: nivel de logs
- `VARIANT_CONCURRENCY`: numero maximo de variantes procesadas en paralelo

## Como levantarlo

Build:

```bash
docker build -t image-processor-go .
```

Run:

```bash
docker run --rm \
  -p 50051:50051 \
  -p 8080:8080 \
  -e SOURCE_BASE_PATH=/data/source \
  -e IMAGE_STORAGE_ROOT=/data/images \
  -v /tmp/image-service/source:/data/source \
  -v /tmp/image-service/output:/data/images \
  image-processor-go
```

Health check:

```bash
curl http://localhost:8080/healthz
```

## Como se integra con Node.js

Node.js actua como cliente gRPC. La capa Node:

- autentica
- valida la entrada publica
- decide que variantes necesita
- persiste metadata en la base de datos

Luego delega a Go la parte pesada del procesamiento y recibe de vuelta las rutas finales de los archivos generados.

## Lo que implemente

- servidor gRPC con `ProcessImage`
- procesamiento con `bimg` y `libvips`
- conversion a WebP
- guardado atomico de variantes en disco
- servidor HTTP para estaticos
- logs estructurados
- manejo de errores consistente
- Dockerfile listo para compilar y correr
- soporte para volumenes compartidos
