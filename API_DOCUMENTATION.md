# Chrome Lens OCR API Documentation

## Overview
Chrome Lens OCR API là một REST API service sử dụng Google Lens OCR để nhận diện text từ hình ảnh. API được containerized với Docker và cung cấp nhiều phương thức để xử lý hình ảnh.

## Base URL
```
http://localhost:3000
```

## Endpoints

### 1. Health Check
**GET** `/health`

Kiểm tra trạng thái của service.

**Response:**
```json
{
  "status": "OK",
  "service": "Chrome Lens OCR API",
  "version": "1.0.0",
  "timestamp": "2025-08-21T08:49:45.737Z",
  "engines": {
    "lens": { "available": true },
    "apple": { "available": true, "mode": "local" }
  }
}
```

`engines.apple` cho biết Apple Vision OCR có dùng được không (xem mục [Apple Vision OCR](#apple-vision-ocr-macos)).

### 2. API Documentation
**GET** `/`

Lấy thông tin về các endpoints có sẵn.

**Response:**
```json
{
  "service": "Chrome Lens OCR API",
  "version": "1.0.0",
  "endpoints": {
    "GET /": "API documentation",
    "GET /health": "Health check",
    "POST /ocr/file": "OCR from uploaded file",
    "POST /ocr/url": "OCR from image URL",
    "POST /ocr/base64": "OCR from base64 encoded image"
  },
  "usage": {
    "/ocr/file": "Upload image file using multipart/form-data with field name \"image\"",
    "/ocr/url": "Send JSON with \"url\" field containing image URL",
    "/ocr/base64": "Send JSON with \"data\" field containing base64 encoded image and optional \"mime\" field"
  }
}
```

### 3. OCR from File Upload
**POST** `/ocr/file`

Upload file hình ảnh để nhận diện text.

**Content-Type:** `multipart/form-data`

**Parameters:**
- `image` (file): File hình ảnh cần nhận diện

**Example:**
```bash
curl -X POST http://localhost:3000/ocr/file \
  -F "image=@/path/to/your/image.png"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "language": "en",
    "segments": [
      {
        "text": "Hello World",
        "boundingBox": {
          "centerPerX": 0.5,
          "centerPerY": 0.1,
          "perWidth": 0.3,
          "perHeight": 0.05,
          "pixelCoords": {
            "x": 100,
            "y": 50,
            "width": 200,
            "height": 30
          }
        }
      }
    ]
  },
  "metadata": {
    "filename": "image.png",
    "size": 12345,
    "mimetype": "image/png"
  }
}
```

### 4. OCR from URL
**POST** `/ocr/url`

Nhận diện text từ hình ảnh qua URL.

**Content-Type:** `application/json`

**Body:**
```json
{
  "url": "https://example.com/image.png"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/ocr/url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://lune.dimden.dev/7949f833fa42.png"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "language": "en",
    "segments": [
      {
        "text": "as shrimple as that",
        "boundingBox": {
          "centerPerX": 0.522605299949646,
          "centerPerY": 0.12587767839431763,
          "perWidth": 0.2423146516084671,
          "perHeight": 0.04275534301996231,
          "pixelCoords": {
            "x": 222,
            "y": 44,
            "width": 134,
            "height": 18
          }
        }
      }
    ]
  },
  "metadata": {
    "url": "https://lune.dimden.dev/7949f833fa42.png"
  }
}
```

### 5. OCR from Base64
**POST** `/ocr/base64`

Nhận diện text từ hình ảnh được encode base64.

**Content-Type:** `application/json`

**Body:**
```json
{
  "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "mime": "image/png"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/ocr/base64 \
  -H "Content-Type: application/json" \
  -d '{"data": "base64_encoded_image_data", "mime": "image/png"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "language": "",
    "segments": []
  },
  "metadata": {
    "size": 70,
    "mime": "image/png"
  }
}
```

## Apple Vision OCR (macOS)

Ngoài Google Lens, các endpoint `/ocr/*` trả thêm kết quả của Apple Vision OCR khi server phát hiện có thể dùng được. Hai engine chạy song song; một engine lỗi không làm hỏng request nếu engine còn lại thành công.

### Cách server phát hiện
1. `APPLE_OCR_URL` được set → **remote**: chuyển ảnh sang một instance server chạy native trên Mac.
2. Server chạy native trên macOS và có binary `bin/apple-ocr` → **local**: gọi Vision framework trực tiếp.
3. Còn lại (ví dụ Docker/Linux) → Apple OCR bị bỏ qua, `apple: null`.

Docker trên Mac chạy trong VM Linux nên container không thể gọi Vision trực tiếp, cần dùng chế độ remote. Hướng dẫn cài đặt đầy đủ trên máy mới: [SETUP.md](SETUP.md).

### Chạy native trên Mac
```bash
npm install
npm run build:apple        # biên dịch apple-ocr/AppleOCR.swift -> bin/apple-ocr
npm run server             # /health sẽ báo engines.apple.mode = "local"
```

### Docker trên Mac (remote)
```bash
# 1. Server native trên host, chỉ lắng nghe localhost
PORT=3001 HOST=127.0.0.1 npm run server

# 2. Container chuyển Apple OCR sang host
APPLE_OCR_URL=http://host.docker.internal:3001 docker compose up -d --build
```

### Query parameters
| Param | Mô tả |
|---|---|
| `engines` | `lens`, `apple` hoặc `lens,apple` (mặc định: cả hai, Apple chỉ chạy khi available) |
| `appleLangs` | Ngôn ngữ cho Apple Vision, ví dụ `vi-VT,en-US` hoặc `ja-JP,zh-Hans`. Mặc định tự nhận diện |

Lưu ý: Apple dùng mã `vi-VT` cho tiếng Việt. Apple Vision không nhận diện tốt nhiều hệ chữ khác nhau trong cùng một ảnh (ví dụ Nhật + Hàn).

**Example:**
```bash
curl -X POST "http://localhost:3000/ocr/file?appleLangs=vi-VT,en-US" \
  -F "image=@/path/to/your/image.png"
```

**Response:**
```json
{
  "success": true,
  "data": { "language": "en", "segments": [ ... ] },
  "apple": {
    "engine": "apple-vision",
    "languages": ["auto"],
    "elapsedMs": 412,
    "segments": [
      {
        "text": "as shrimple as that",
        "confidence": 1,
        "boundingBox": {
          "centerPerX": 0.523,
          "centerPerY": 0.13,
          "perWidth": 0.245,
          "perHeight": 0.043,
          "pixelCoords": { "x": 222, "y": 46, "width": 136, "height": 18 }
        }
      }
    ]
  },
  "engines": {
    "lens": { "ok": true, "ms": 3338 },
    "apple": { "ok": true, "available": true, "mode": "remote", "ms": 1858 }
  },
  "metadata": { "filename": "image.png", "size": 12345, "mimetype": "image/png" }
}
```

- `data`: kết quả Google Lens (giữ nguyên như trước), `null` nếu Lens lỗi hoặc không được chọn.
- `apple`: kết quả Apple Vision, cùng cấu trúc `Segment` với thêm `confidence` (0..1); `null` nếu không khả dụng hoặc lỗi.
- `engines.<name>`: trạng thái từng engine, gồm `ms`, và `error` hoặc `reason` khi không thành công.
- Chỉ trả HTTP 500 khi tất cả engine được chọn đều lỗi.

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing URL",
  "message": "Please provide a \"url\" field with the image URL"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Endpoint GET /nonexistent not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "OCR processing failed",
  "message": "Error message details",
  "details": "ERROR_CODE"
}
```

## Data Structure

### LensResult
```typescript
{
  language: string,     // Ngôn ngữ được phát hiện (2-letter format)
  segments: Segment[]   // Mảng các đoạn text được nhận diện
}
```

### Segment
```typescript
{
  text: string,           // Text được nhận diện
  boundingBox: BoundingBox // Vị trí của text trong hình ảnh
}
```

### BoundingBox
```typescript
{
  centerPerX: number,    // Tâm X theo % chiều rộng hình ảnh
  centerPerY: number,    // Tâm Y theo % chiều cao hình ảnh
  perWidth: number,      // Chiều rộng theo % chiều rộng hình ảnh
  perHeight: number,     // Chiều cao theo % chiều cao hình ảnh
  pixelCoords: {
    x: number,           // Tọa độ X góc trên-trái (pixels)
    y: number,           // Tọa độ Y góc trên-trái (pixels)
    width: number,       // Chiều rộng (pixels)
    height: number       // Chiều cao (pixels)
  }
}
```

## Docker Usage

### Build và Run
```bash
# Build image
docker-compose build

# Run container
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop container
docker-compose down
```

### Health Check
Container có built-in health check endpoint tại `/health` được kiểm tra mỗi 30 giây.

## Limitations
- File upload giới hạn 50MB
- Hỗ trợ các format hình ảnh phổ biến (PNG, JPG, JPEG, GIF, etc.)
- Hình ảnh lớn hơn 1200px sẽ được resize tự động để tối ưu hiệu suất
