// Apple Vision OCR CLI (macOS only), used by src/apple.js
// Build: npm run build:apple
// Usage: apple-ocr <image | -> [--langs vi-VT,en-US] [--fast] [--list-langs]
//   "-" reads the image from stdin
// Prints JSON: { engine, languages, width, height, elapsedMs, lines: [{text, confidence, box}] }
// box is normalized (0..1) with a top-left origin
import Foundation
import Vision
import AppKit

let args = CommandLine.arguments
guard args.count >= 2 else {
    FileHandle.standardError.write("usage: apple_ocr <image> [--langs a,b] [--fast] [--list-langs]\n".data(using: .utf8)!)
    exit(2)
}

if args.contains("--list-langs") {
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    print((try? req.supportedRecognitionLanguages()) ?? [])
    exit(0)
}

let path = args[1]
var langs: [String]? = nil
if let i = args.firstIndex(of: "--langs"), i + 1 < args.count {
    langs = args[i + 1].split(separator: ",").map(String.init)
}
let fast = args.contains("--fast")

let loaded = path == "-"
    ? NSImage(data: FileHandle.standardInput.readDataToEndOfFile())
    : NSImage(contentsOfFile: path)
guard let nsImage = loaded,
      let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("cannot load image \(path)\n".data(using: .utf8)!)
    exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = fast ? .fast : .accurate
request.usesLanguageCorrection = true
if let langs = langs {
    request.recognitionLanguages = langs
    request.automaticallyDetectsLanguage = false
} else {
    request.automaticallyDetectsLanguage = true
}

let start = Date()
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
    try handler.perform([request])
} catch {
    FileHandle.standardError.write("vision error: \(error)\n".data(using: .utf8)!)
    exit(1)
}
let elapsed = Date().timeIntervalSince(start) * 1000

var lines: [[String: Any]] = []
for obs in request.results ?? [] {
    guard let top = obs.topCandidates(1).first else { continue }
    let b = obs.boundingBox // normalized, origin bottom-left
    lines.append([
        "text": top.string,
        "confidence": Double(top.confidence),
        "box": ["x": b.minX, "y": 1 - b.maxY, "w": b.width, "h": b.height],
    ])
}

let out: [String: Any] = [
    "engine": "apple-vision",
    "level": fast ? "fast" : "accurate",
    "languages": langs ?? ["auto"],
    "width": cgImage.width,
    "height": cgImage.height,
    "elapsedMs": elapsed,
    "lines": lines,
]
let data = try JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted, .sortedKeys])
print(String(data: data, encoding: .utf8)!)
