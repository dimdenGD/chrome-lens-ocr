# Hướng dẫn setup trên máy mới

Tài liệu này hướng dẫn cài đặt OCR API (Google Lens + Apple Vision OCR) trên một máy khác. Chi tiết endpoint và response xem [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## Kiến trúc

```
Client / Web UI
      │ :3000
      ▼
┌─────────────────────────────┐        ┌────────────────────────────────┐
│ Docker: vg-ocr-api          │ :3001  │ macOS native: server.js        │
│ - Google Lens               │ ─────► │ - Apple Vision (bin/apple-ocr) │
└─────────────────────────────┘        └────────────────────────────────┘
```

- **Google Lens** chạy ở mọi nơi (Docker, Linux, macOS), cần kết nối Internet.
- **Apple Vision OCR** chỉ chạy native trên macOS. Docker trên Mac chạy trong VM Linux nên container không gọi Vision trực tiếp được, mà chuyển ảnh sang một instance `server.js` chạy native trên Mac qua `APPLE_OCR_URL`.
- Hai engine chạy song song trong mỗi request. Nếu Apple không khả dụng, API vẫn trả kết quả Lens với `apple: null`.

Chọn một trong ba cách setup:

| Cách | Khi nào dùng | Có Apple OCR |
|---|---|---|
| [A. Mac + Docker](#a-mac--docker-khuyến-nghị) | Dev/test trên Mac, giống môi trường production | Có (remote) |
| [B. Mac native](#b-mac-native-không-docker) | Chạy nhanh trên Mac, không cần Docker | Có (local) |
| [C. Linux / server](#c-linux--server) | Production, CI | Không |

## Yêu cầu

| Thành phần | Mac (cách A, B) | Linux (cách C) |
|---|---|---|
| macOS | 13 Ventura trở lên (đã test trên 15.7) | — |
| Xcode Command Line Tools (`swiftc`) | Bắt buộc | — |
| Node.js | 18 trở lên | Không cần (chạy trong Docker) |
| Docker | Docker Desktop (cách A) | Docker Engine + Compose v2 |

Kiểm tra nhanh trên Mac:
```bash
sw_vers -productVersion   # >= 13
swiftc --version          # nếu lỗi: xcode-select --install
node -v                   # >= v18
docker compose version    # chỉ cần cho cách A
```

## A. Mac + Docker (khuyến nghị)

### 1. Clone và cài dependencies trên host
```bash
git clone https://github.com/tinhthanh/chrome-lens-ocr.git
cd chrome-lens-ocr
npm ci
```

### 2. Build công cụ Apple OCR
```bash
npm run build:apple
./bin/apple-ocr --list-langs x      # in danh sách ngôn ngữ hỗ trợ, phải có "vi-VT"
```

Binary được biên dịch cho đúng kiến trúc của máy (Intel `x86_64` hoặc Apple Silicon `arm64`). Không copy thư mục `bin/` giữa các máy, hãy build lại trên từng máy.

### 3. Chạy server Apple OCR native trên host
```bash
PORT=3001 HOST=127.0.0.1 npm run server
```

Log khởi động phải có dòng:
```
Apple Vision OCR: enabled (local)
```

`HOST=127.0.0.1` giới hạn server chỉ nhận kết nối từ chính máy Mac; Docker Desktop vẫn truy cập được qua `host.docker.internal`. Terminal này cần được giữ mở, hoặc cấu hình tự khởi động ở [bước tuỳ chọn](#tuỳ-chọn-tự-khởi-động-server-apple-ocr-bằng-launchd).

### 4. Chạy container
Mở terminal khác trong thư mục dự án:
```bash
echo "APPLE_OCR_URL=http://host.docker.internal:3001" > .env
docker compose up -d --build
```

`docker compose` tự đọc file `.env` trong thư mục dự án. File này đã có trong `.gitignore`.

### 5. Kiểm tra
```bash
curl -s http://localhost:3000/health | jq .engines
```
Kết quả mong đợi:
```json
{
  "lens": { "available": true },
  "apple": { "available": true, "mode": "remote", "url": "http://host.docker.internal:3001" }
}
```

Thử OCR:
```bash
curl -s -X POST http://localhost:3000/ocr/file -F image=@test_image.png \
  | jq '{lens: [.data.segments[].text], apple: [.apple.segments[].text], engines}'
```
Cả `lens` và `apple` phải có `"as shrimple as that"`. Web UI: http://localhost:3000/

## B. Mac native (không Docker)

```bash
git clone https://github.com/tinhthanh/chrome-lens-ocr.git
cd chrome-lens-ocr
npm ci
npm run build:apple
npm run server              # mặc định cổng 3000
```

`/health` sẽ báo `engines.apple.mode = "local"`. Một server duy nhất xử lý cả Lens và Apple OCR.

## C. Linux / server

```bash
git clone https://github.com/tinhthanh/chrome-lens-ocr.git
cd chrome-lens-ocr
docker compose up -d --build
```

Không set `APPLE_OCR_URL`. API chỉ chạy Google Lens, response có `apple: null` và `engines.apple.reason = "Not running on macOS (platform: linux)"`. Client cũ không bị ảnh hưởng vì `data` vẫn là kết quả Lens.

Production dùng `docker-compose.prod.yml` qua GitHub Actions: mỗi lần push lên `main` sẽ build image và deploy. Không cần cấu hình thêm cho Apple OCR.

## Chạy nền bằng run.sh / stop.sh (Mac)

Chạy toàn bộ hệ thống bằng một lệnh, tiếp tục chạy kể cả khi đóng VS Code hoặc terminal:

```bash
./run.sh     # server Apple OCR (3001) + container (3000) + Cloudflare tunnel
./stop.sh    # tắt tunnel, container và server Apple OCR
```

`run.sh` tự làm các bước sau nếu cần: `npm ci`, `npm run build:apple` (build lại khi `AppleOCR.swift` thay đổi), thêm `APPLE_OCR_URL` vào `.env`, mở Docker Desktop, rồi build và chạy container. Chạy lại nhiều lần không sao; thành phần nào đang chạy sẽ được bỏ qua. Tunnel chỉ chạy khi có file `~/.cloudflared/ocr-01.yml`.

Log nằm trong `.run/` (`apple.log`, `docker.log`, `tunnel.log`). Có thể đổi cấu hình bằng biến môi trường: `APPLE_PORT`, `API_PORT`, `TUNNEL_NAME`, `TUNNEL_CONFIG`, `PUBLIC_URL`.

Các tiến trình này không tự chạy lại sau khi khởi động lại máy. Khi đó chạy lại `./run.sh`, hoặc dùng launchd như mục dưới.

## Tuỳ chọn: tự khởi động server Apple OCR bằng launchd

Để server ở bước A.3 tự chạy khi đăng nhập và tự khởi động lại khi bị crash, tạo LaunchAgent.

1. Lấy đường dẫn Node và thư mục dự án:
   ```bash
   which node     # ví dụ /usr/local/bin/node hoặc /opt/homebrew/bin/node
   pwd            # ví dụ /Users/<user>/chrome-lens-ocr
   ```

2. Tạo file `~/Library/LaunchAgents/com.vg-ocr.apple.plist`, thay `NODE_PATH` và `PROJECT_DIR` bằng giá trị ở trên:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>Label</key>
       <string>com.vg-ocr.apple</string>
       <key>ProgramArguments</key>
       <array>
           <string>NODE_PATH</string>
           <string>PROJECT_DIR/server.js</string>
       </array>
       <key>WorkingDirectory</key>
       <string>PROJECT_DIR</string>
       <key>EnvironmentVariables</key>
       <dict>
           <key>PORT</key>
           <string>3001</string>
           <key>HOST</key>
           <string>127.0.0.1</string>
       </dict>
       <key>RunAtLoad</key>
       <true/>
       <key>KeepAlive</key>
       <true/>
       <key>StandardOutPath</key>
       <string>/tmp/vg-ocr-apple.log</string>
       <key>StandardErrorPath</key>
       <string>/tmp/vg-ocr-apple.log</string>
   </dict>
   </plist>
   ```
   `WorkingDirectory` là bắt buộc vì server phục vụ Web UI từ thư mục `public` theo đường dẫn tương đối.

3. Nạp và kiểm tra:
   ```bash
   plutil -lint ~/Library/LaunchAgents/com.vg-ocr.apple.plist
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.vg-ocr.apple.plist
   curl -s http://localhost:3001/health | jq .engines.apple
   ```

4. Dừng hoặc gỡ:
   ```bash
   launchctl bootout gui/$(id -u)/com.vg-ocr.apple
   rm ~/Library/LaunchAgents/com.vg-ocr.apple.plist
   ```

Sau khi `git pull` có thay đổi code, chạy lại `npm ci`, `npm run build:apple`, rồi khởi động lại agent bằng `launchctl kickstart -k gui/$(id -u)/com.vg-ocr.apple`.

## Biến môi trường

| Biến | Mặc định | Mô tả |
|---|---|---|
| `PORT` | `3000` | Cổng HTTP |
| `HOST` | `0.0.0.0` | Địa chỉ lắng nghe. Dùng `127.0.0.1` cho server Apple OCR trên host |
| `APPLE_OCR_URL` | (trống) | URL của server native trên Mac, ví dụ `http://host.docker.internal:3001`. Khi được set, Apple OCR chạy ở chế độ remote |
| `APPLE_OCR_BIN` | `bin/apple-ocr` | Đường dẫn binary Apple OCR (chế độ local) |

## Xử lý sự cố

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Web UI hoặc `/health` báo `Cannot reach http://host.docker.internal:3001: fetch failed` | Server native trên host (bước A.3) chưa chạy hoặc đã dừng. Chạy lại; container tự nhận lại trong vòng khoảng 5 giây |
| `Binary not found at .../bin/apple-ocr` | Chưa build: chạy `npm run build:apple` |
| `npm run build:apple` báo `swiftc: command not found` | Cài Xcode Command Line Tools: `xcode-select --install` |
| `Not running on macOS (platform: linux)` | Bình thường khi chạy trong Docker mà không set `APPLE_OCR_URL`, hoặc trên server Linux |
| `Remote server has no local Apple OCR` | `APPLE_OCR_URL` trỏ tới một server không build binary, hoặc chính nó cũng chạy trong Docker. Kiểm tra `curl localhost:3001/health` phải báo `mode: "local"` |
| `Invalid appleLangs` | Sai định dạng. Tiếng Việt là `vi-VT` (không phải `vi-VN`). Danh sách đầy đủ: `./bin/apple-ocr --list-langs x` |
| Apple OCR bỏ sót dòng khi ảnh có nhiều hệ chữ (Nhật + Hàn...) | Giới hạn của Apple Vision. Kết quả Lens trong `data` không bị ảnh hưởng |
| Container hiển thị `unhealthy` trong `docker compose ps` | Lỗi đã có từ trước: healthcheck gọi `localhost`, trong Alpine tên này resolve sang IPv6 `::1` còn server chỉ nghe IPv4. API vẫn hoạt động bình thường; kiểm tra bằng `docker exec vg-ocr-api wget -qO- http://127.0.0.1:3000/health` |
| `docker compose` cảnh báo `the attribute version is obsolete` | Chỉ là cảnh báo, không ảnh hưởng |

## Hiệu năng tham khảo

Đo trên MacBook Intel, macOS 15.7, ảnh dưới 1200px:

- Lens: khoảng 0.6–2 giây mỗi ảnh (phụ thuộc mạng và Google).
- Apple Vision: khoảng 1–1.2 giây mỗi ảnh (mỗi request khởi động một tiến trình mới và nạp lại model).
- Chạy cả hai: tổng thời gian xấp xỉ engine chậm hơn, cộng khoảng 5 ms.
