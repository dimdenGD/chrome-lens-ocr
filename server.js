import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Lens from './src/index.js';
import { appleOcrStatus, scanWithApple } from './src/apple.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Initialize Lens
const lens = new Lens();

// ?engines=lens,apple selects engines (default: both, Apple only when available)
function requestedEngines(req) {
    const list = req.query.engines ? String(req.query.engines).split(',').map(s => s.trim()) : ['lens', 'apple'];
    return { lens: list.includes('lens'), apple: list.includes('apple') };
}

async function timed(fn) {
    const start = Date.now();
    try {
        return { ok: true, result: await fn(), ms: Date.now() - start };
    } catch (error) {
        return { ok: false, error, ms: Date.now() - start };
    }
}

// Runs the requested engines in parallel. A failing engine does not fail the request
// as long as at least one engine succeeded.
async function runOcr(req, { scanLens, getBuffer }) {
    const want = requestedEngines(req);
    const apple = want.apple ? await appleOcrStatus() : null;

    const [lensRun, appleRun] = await Promise.all([
        want.lens ? timed(scanLens) : null,
        apple?.available
            ? timed(async () => scanWithApple(await getBuffer(), { langs: req.query.appleLangs }))
            : null,
    ]);

    const engines = {};
    if (lensRun) {
        engines.lens = lensRun.ok
            ? { ok: true, ms: lensRun.ms }
            : { ok: false, ms: lensRun.ms, error: lensRun.error.message };
    }
    if (apple) {
        if (!apple.available) {
            engines.apple = { ok: false, available: false, reason: apple.reason };
        } else {
            engines.apple = { ok: appleRun.ok, available: true, mode: apple.mode, ms: appleRun.ms };
            if (!appleRun.ok) engines.apple.error = appleRun.error.message;
        }
    }

    const failed = [lensRun, appleRun].filter(r => r && !r.ok);
    failed.forEach(r => console.error('OCR engine error:', r.error));

    return {
        success: Boolean(lensRun?.ok || appleRun?.ok),
        data: lensRun?.ok ? lensRun.result : null,
        apple: appleRun?.ok ? appleRun.result : null,
        engines,
        error: failed[0]?.error || (apple && !apple.available ? new Error(apple.reason) : undefined),
    };
}

function sendOcr(res, outcome, metadata) {
    const { success, data, apple, engines, error } = outcome;
    if (!success) {
        return res.status(500).json({
            error: 'OCR processing failed',
            message: error?.message || 'No OCR engine selected',
            details: error?.code || 'UNKNOWN_ERROR',
            engines
        });
    }
    res.json({ success, data, apple, engines, metadata });
}

// Health check endpoint
app.get('/health', async (req, res) => {
    res.json({
        status: 'OK',
        service: 'Chrome Lens OCR API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        engines: {
            lens: { available: true },
            apple: await appleOcrStatus()
        }
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        service: 'Chrome Lens OCR API',
        version: '1.0.0',
        endpoints: {
            'GET /health': 'Health check (includes OCR engine availability)',
            'GET /api': 'API documentation',
            'POST /ocr/file': 'OCR from uploaded file',
            'POST /ocr/url': 'OCR from image URL',
            'POST /ocr/base64': 'OCR from base64 encoded image'
        },
        usage: {
            '/ocr/file': 'Upload image file using multipart/form-data with field name "image"',
            '/ocr/url': 'Send JSON with "url" field containing image URL',
            '/ocr/base64': 'Send JSON with "data" field containing base64 encoded image and optional "mime" field'
        },
        queryParams: {
            engines: 'Comma-separated engines to run: "lens", "apple" (default: both; Apple only when available)',
            appleLangs: 'Apple Vision recognition languages, e.g. "vi-VT,en-US" (default: auto-detect)'
        }
    });
});

// OCR from uploaded file
app.post('/ocr/file', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            error: 'No file uploaded',
            message: 'Please upload an image file using the "image" field'
        });
    }

    console.log(`Processing uploaded file: ${req.file.originalname}, size: ${req.file.size} bytes`);

    const buffer = req.file.buffer;
    const outcome = await runOcr(req, {
        scanLens: () => lens.scanByBuffer(buffer),
        getBuffer: async () => buffer
    });

    sendOcr(res, outcome, {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
    });
});

// OCR from URL
app.post('/ocr/url', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({
            error: 'Missing URL',
            message: 'Please provide a "url" field with the image URL'
        });
    }

    console.log(`Processing image from URL: ${url}`);

    const outcome = await runOcr(req, {
        scanLens: () => lens.scanByURL(url),
        getBuffer: async () => {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch image from URL: ${url}, status: ${response.status}`);
            }
            return Buffer.from(await response.arrayBuffer());
        }
    });

    sendOcr(res, outcome, { url });
});

// OCR from base64 data
app.post('/ocr/base64', async (req, res) => {
    const { data, mime } = req.body;

    if (!data) {
        return res.status(400).json({
            error: 'Missing data',
            message: 'Please provide a "data" field with base64 encoded image'
        });
    }

    console.log(`Processing base64 image, mime: ${mime || 'auto-detect'}`);

    // Remove data URL prefix if present
    const base64Data = data.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const outcome = await runOcr(req, {
        scanLens: () => lens.scanByBuffer(buffer),
        getBuffer: async () => buffer
    });

    sendOcr(res, outcome, {
        size: buffer.length,
        mime: mime || 'auto-detected'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Endpoint ${req.method} ${req.path} not found`
    });
});

// Start server
app.listen(port, host, async () => {
    console.log(`Chrome Lens OCR API server running on ${host}:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`API docs: http://localhost:${port}/api`);
    console.log(`Web UI: http://localhost:${port}/`);
    const apple = await appleOcrStatus();
    console.log(`Apple Vision OCR: ${apple.available ? `enabled (${apple.mode})` : `disabled - ${apple.reason}`}`);
});
