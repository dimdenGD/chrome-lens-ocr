import { execFile } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Apple Vision OCR is only available on macOS. Two modes:
// - local:  this process runs natively on macOS and calls the compiled Swift binary
// - remote: this process runs elsewhere (e.g. Docker on a Mac) and forwards to a
//           native instance of this server set via APPLE_OCR_URL
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = process.env.APPLE_OCR_BIN || join(ROOT, 'bin', 'apple-ocr');
const REMOTE = (process.env.APPLE_OCR_URL || '').replace(/\/+$/, '');
const TIMEOUT_MS = 30000;
const STATUS_TTL_MS = 30000;
// Re-check sooner after a failure so a host server started later is picked up quickly
const UNAVAILABLE_TTL_MS = 5000;
const LANGS_RE = /^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?(,[A-Za-z]{2,3}(-[A-Za-z]{2,4})?)*$/;

let cachedStatus = null;
let cachedAt = 0;

async function checkStatus() {
    if (REMOTE) {
        try {
            const res = await fetch(`${REMOTE}/health`, { signal: AbortSignal.timeout(1500) });
            const body = await res.json();
            if (body.engines?.apple?.available && body.engines.apple.mode === 'local') {
                return { available: true, mode: 'remote', url: REMOTE };
            }
            return { available: false, mode: 'remote', url: REMOTE, reason: 'Remote server has no local Apple OCR' };
        } catch (error) {
            return { available: false, mode: 'remote', url: REMOTE, reason: `Cannot reach ${REMOTE}: ${error.message}` };
        }
    }

    if (process.platform !== 'darwin') {
        return { available: false, reason: `Not running on macOS (platform: ${process.platform})` };
    }
    try {
        await access(BIN, constants.X_OK);
        return { available: true, mode: 'local' };
    } catch {
        return { available: false, mode: 'local', reason: `Binary not found at ${BIN}, run "npm run build:apple"` };
    }
}

export async function appleOcrStatus() {
    const ttl = cachedStatus?.available ? STATUS_TTL_MS : UNAVAILABLE_TTL_MS;
    if (!cachedStatus || Date.now() - cachedAt > ttl) {
        cachedStatus = await checkStatus();
        cachedAt = Date.now();
    }
    return cachedStatus;
}

// Convert the Swift tool output into the same Segment/BoundingBox shape Lens returns
function toResult(raw) {
    const { width, height } = raw;
    return {
        engine: 'apple-vision',
        languages: raw.languages,
        elapsedMs: Math.round(raw.elapsedMs),
        segments: raw.lines.map(line => {
            const { x, y, w, h } = line.box;
            return {
                text: line.text,
                confidence: line.confidence,
                boundingBox: {
                    centerPerX: x + w / 2,
                    centerPerY: y + h / 2,
                    perWidth: w,
                    perHeight: h,
                    pixelCoords: {
                        x: Math.round(x * width),
                        y: Math.round(y * height),
                        width: Math.round(w * width),
                        height: Math.round(h * height),
                    },
                },
            };
        }),
    };
}

function runLocal(buffer, langs) {
    const args = ['-', ...(langs ? ['--langs', langs] : [])];
    return new Promise((resolve, reject) => {
        const child = execFile(BIN, args, { timeout: TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) return reject(new Error(`Apple OCR failed: ${stderr.trim() || error.message}`));
            try {
                resolve(toResult(JSON.parse(stdout)));
            } catch (e) {
                reject(new Error(`Apple OCR returned invalid output: ${e.message}`));
            }
        });
        child.stdin.on('error', () => {}); // surfaced via the exit callback
        child.stdin.end(buffer);
    });
}

async function runRemote(buffer, langs) {
    const form = new FormData();
    form.append('image', new Blob([buffer]), 'image');
    const qs = new URLSearchParams({ engines: 'apple', ...(langs ? { appleLangs: langs } : {}) });
    const res = await fetch(`${REMOTE}/ocr/file?${qs}`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.json();
    if (!body.apple) {
        throw new Error(`Remote Apple OCR failed: ${body.engines?.apple?.error || body.engines?.apple?.reason || body.message || res.status}`);
    }
    return body.apple;
}

export async function scanWithApple(buffer, { langs } = {}) {
    if (langs && !LANGS_RE.test(langs)) {
        throw new Error(`Invalid appleLangs "${langs}", expected e.g. "vi-VT,en-US"`);
    }
    const status = await appleOcrStatus();
    if (!status.available) throw new Error(status.reason);
    return status.mode === 'remote' ? runRemote(buffer, langs) : runLocal(buffer, langs);
}
