// API Configuration - Auto-detect base path from current URL
function detectBasePath() {
    const path = window.location.pathname;
    // Loại bỏ /index.html nếu có
    const cleanPath = path.replace(/\/index\.html$/, '');
    // Nếu path là '/' hoặc rỗng thì không có base path
    if (cleanPath === '/' || cleanPath === '') {
        return '';
    }
    // Loại bỏ trailing slash
    return cleanPath.replace(/\/$/, '');
}

const BASE_PATH = detectBasePath();
const API_BASE = window.location.origin + BASE_PATH;

// Global variables
let currentImageData = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    checkAPIStatus();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // File input change
    document.getElementById('file-input').addEventListener('change', handleFileSelect);
    
    // Drag and drop
    const dropZone = document.querySelector('.border-dashed');
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);
    
    // URL input enter key
    document.getElementById('url-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            processURL();
        }
    });
}

// Check API status
async function checkAPIStatus() {
    const statusElement = document.getElementById('api-status');
    
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        if (response.ok && data.status === 'OK') {
            statusElement.innerHTML = `
                <div class="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span class="text-green-600">API Online - ${data.service} v${data.version}</span>
            `;
        } else {
            throw new Error('API not healthy');
        }
    } catch (error) {
        statusElement.innerHTML = `
            <div class="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span class="text-red-600">API Offline - ${error.message}</span>
        `;
    }
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
}

// Handle drop
function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

// Process file upload
async function processFile(file) {
    if (!file.type.startsWith('image/')) {
        showError('Vui lòng chọn file ảnh hợp lệ');
        return;
    }
    
    showProcessing();
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(`${API_BASE}/ocr/file`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Create image URL for display
            const imageUrl = URL.createObjectURL(file);
            displayResults(result, imageUrl, {
                filename: file.name,
                size: file.size,
                type: file.type
            });
        } else {
            throw new Error(result.message || 'OCR processing failed');
        }
    } catch (error) {
        showError(`Lỗi xử lý file: ${error.message}`);
    } finally {
        hideProcessing();
    }
}

// Process URL
async function processURL() {
    const url = document.getElementById('url-input').value.trim();
    
    if (!url) {
        showError('Vui lòng nhập URL ảnh');
        return;
    }
    
    showProcessing();
    
    try {
        const response = await fetch(`${API_BASE}/ocr/url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            displayResults(result, url, { url });
        } else {
            throw new Error(result.message || 'OCR processing failed');
        }
    } catch (error) {
        showError(`Lỗi xử lý URL: ${error.message}`);
    } finally {
        hideProcessing();
    }
}

// Load test image
function loadTestImage() {
    document.getElementById('url-input').value = 'https://lune.dimden.dev/7949f833fa42.png';
    processURL();
}

// Display results
function displayResults(result, imageUrl, metadata) {
    currentImageData = result;
    
    // Show results container
    document.getElementById('results-container').classList.remove('hidden');
    document.getElementById('error-container').classList.add('hidden');
    
    // Display image with overlays
    // Lens result is primary; fall back to Apple Vision when Lens failed
    const primary = result.data || result.apple;
    displayImageWithOverlays(imageUrl, primary.segments);

    // Display metadata
    displayImageInfo(metadata, result.metadata);

    // Display OCR summary
    displayOCRSummary(result);

    // Display text segments
    displayTextSegments(primary.segments);
}

// Display image with text overlays
function displayImageWithOverlays(imageUrl, segments) {
    const container = document.getElementById('image-display');
    container.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'max-w-full h-auto border border-gray-300 rounded';
    
    img.onload = function() {
        const imgRect = img.getBoundingClientRect();
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        const displayWidth = img.offsetWidth;
        const displayHeight = img.offsetHeight;
        
        // Calculate scale factors
        const scaleX = displayWidth / imgWidth;
        const scaleY = displayHeight / imgHeight;
        
        // Create overlays for each text segment
        segments.forEach((segment, index) => {
            const overlay = createTextOverlay(segment, index, scaleX, scaleY);
            container.appendChild(overlay);
        });
    };
    
    container.appendChild(img);
}

// Create text overlay element
function createTextOverlay(segment, index, scaleX, scaleY) {
    const overlay = document.createElement('div');
    overlay.className = 'text-overlay';
    
    const coords = segment.boundingBox.pixelCoords;
    const left = coords.x * scaleX;
    const top = coords.y * scaleY;
    const width = coords.width * scaleX;
    const height = coords.height * scaleY;
    
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    
    // Add text label
    const label = document.createElement('div');
    label.className = 'text-label';
    label.textContent = segment.text;
    label.title = segment.text; // Full text on hover
    
    overlay.appendChild(label);
    
    // Add click handler to highlight corresponding text segment
    overlay.addEventListener('click', () => {
        highlightTextSegment(index);
    });
    
    return overlay;
}

// Display image info
function displayImageInfo(metadata, apiMetadata) {
    const container = document.getElementById('image-info');
    const info = [];
    
    if (metadata.filename) {
        info.push(`<div><strong>File:</strong> ${metadata.filename}</div>`);
    }
    if (metadata.url) {
        info.push(`<div><strong>URL:</strong> <a href="${metadata.url}" target="_blank" class="text-blue-500 hover:underline">Link</a></div>`);
    }
    if (metadata.size || apiMetadata?.size) {
        const size = metadata.size || apiMetadata.size;
        info.push(`<div><strong>Size:</strong> ${formatFileSize(size)}</div>`);
    }
    if (metadata.type || apiMetadata?.mimetype) {
        const type = metadata.type || apiMetadata.mimetype;
        info.push(`<div><strong>Type:</strong> ${type}</div>`);
    }
    
    container.innerHTML = info.join('');
}

// Display OCR summary
function displayOCRSummary(result) {
    const container = document.getElementById('ocr-summary');
    const info = [];
    const lensStatus = result.engines?.lens;
    const appleStatus = result.engines?.apple;

    if (result.data) {
        const data = result.data;
        info.push(
            `<div class="font-medium text-gray-700">Google Lens${lensStatus ? ` (${lensStatus.ms} ms)` : ''}</div>`,
            `<div><strong>Language:</strong> ${data.language || 'Unknown'}</div>`,
            `<div><strong>Text segments:</strong> ${data.segments.length}</div>`,
            `<div><strong>Total text:</strong> ${data.segments.map(s => s.text).join(' ')}</div>`
        );
    } else if (lensStatus) {
        info.push(`<div class="text-red-600"><strong>Google Lens:</strong> ${escapeHtml(lensStatus.error)}</div>`);
    }

    if (result.apple) {
        info.push(
            `<div class="font-medium text-gray-700 mt-3">Apple Vision (${appleStatus.mode}, ${appleStatus.ms} ms)</div>`,
            `<div><strong>Text segments:</strong> ${result.apple.segments.length}</div>`,
            `<div><strong>Total text:</strong> ${escapeHtml(result.apple.segments.map(s => s.text).join(' '))}</div>`
        );
    } else if (appleStatus) {
        info.push(`<div class="text-gray-500 mt-3"><strong>Apple Vision:</strong> ${escapeHtml(appleStatus.reason || appleStatus.error)}</div>`);
    }
    
    container.innerHTML = info.join('');
}

// Display text segments
function displayTextSegments(segments) {
    const container = document.getElementById('text-segments');
    
    if (segments.length === 0) {
        container.innerHTML = '<div class="text-gray-500 italic">Không tìm thấy text nào trong ảnh</div>';
        return;
    }
    
    const segmentElements = segments.map((segment, index) => {
        const coords = segment.boundingBox.pixelCoords;
        const percent = segment.boundingBox;
        
        return `
            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer" 
                 onclick="highlightTextSegment(${index})" id="segment-${index}">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-medium text-gray-800">Text #${index + 1}</h4>
                    <span class="text-xs text-gray-500">Click to highlight</span>
                </div>
                <div class="text-lg mb-3 p-2 bg-gray-100 rounded">"${segment.text}"</div>
                <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                        <strong>Position (pixels):</strong><br>
                        X: ${coords.x}, Y: ${coords.y}<br>
                        Width: ${coords.width}, Height: ${coords.height}
                    </div>
                    <div>
                        <strong>Position (%):</strong><br>
                        Center: ${(percent.centerPerX * 100).toFixed(1)}%, ${(percent.centerPerY * 100).toFixed(1)}%<br>
                        Size: ${(percent.perWidth * 100).toFixed(1)}% × ${(percent.perHeight * 100).toFixed(1)}%
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = segmentElements;
}

// Highlight text segment
function highlightTextSegment(index) {
    // Remove previous highlights
    document.querySelectorAll('.text-overlay').forEach(overlay => {
        overlay.style.borderColor = '#ef4444';
        overlay.style.borderWidth = '2px';
    });
    
    document.querySelectorAll('[id^="segment-"]').forEach(segment => {
        segment.classList.remove('bg-blue-50', 'border-blue-300');
    });
    
    // Highlight selected overlay and segment
    const overlays = document.querySelectorAll('.text-overlay');
    const segments = document.querySelectorAll('[id^="segment-"]');
    
    if (overlays[index]) {
        overlays[index].style.borderColor = '#3b82f6';
        overlays[index].style.borderWidth = '3px';
    }
    
    if (segments[index]) {
        segments[index].classList.add('bg-blue-50', 'border-blue-300');
        segments[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Show processing status
function showProcessing() {
    document.getElementById('processing-status').classList.remove('hidden');
    document.getElementById('results-container').classList.add('hidden');
    document.getElementById('error-container').classList.add('hidden');
}

// Hide processing status
function hideProcessing() {
    document.getElementById('processing-status').classList.add('hidden');
}

// Show error
function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-container').classList.remove('hidden');
    document.getElementById('results-container').classList.add('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
