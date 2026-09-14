#!/bin/bash

echo "=== Chrome Lens OCR API Test Suite ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="http://localhost:3000"

# Function to test API endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local content_type="$5"
    
    echo -e "${YELLOW}Testing: $name${NC}"
    echo "Endpoint: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_BASE$endpoint")
    elif [ "$content_type" = "multipart" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$endpoint" -F "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ SUCCESS (HTTP $http_code)${NC}"
        echo "Response: $(echo "$body" | jq -r '.success // .status // "N/A"')"
    else
        echo -e "${RED}✗ FAILED (HTTP $http_code)${NC}"
        echo "Response: $body"
    fi
    echo ""
}

# Wait for container to be ready
echo "Waiting for container to be ready..."
sleep 5

# Test 1: Health Check
test_endpoint "Health Check" "GET" "/health"

# Test 2: API Documentation
test_endpoint "API Documentation" "GET" "/"

# Test 3: OCR from URL
test_endpoint "OCR from URL" "POST" "/ocr/url" '{"url": "https://lune.dimden.dev/7949f833fa42.png"}'

# Test 4: OCR from Base64 (simple text image)
# Create a simple base64 encoded image (1x1 pixel PNG)
base64_data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
test_endpoint "OCR from Base64" "POST" "/ocr/base64" "{\"data\": \"$base64_data\", \"mime\": \"image/png\"}"

# Test 5: Error handling - Invalid URL
test_endpoint "Error Handling - Invalid URL" "POST" "/ocr/url" '{"url": "invalid-url"}'

# Test 6: Error handling - Missing data
test_endpoint "Error Handling - Missing URL" "POST" "/ocr/url" '{}'

# Test 7: Error handling - Missing base64 data
test_endpoint "Error Handling - Missing Base64 Data" "POST" "/ocr/base64" '{}'

# Test 8: 404 endpoint
test_endpoint "404 Error" "GET" "/nonexistent"

echo "=== Test Suite Complete ==="
