# Chrome Lens OCR
Package to use Google Lens OCR for free, via API used in Chromium.

## Installation
```bash
npm i chrome-lens-ocr
```

## Usage
```javascript
import Lens from 'chrome-lens-ocr';

const lens = new Lens(options);

lens.scanByFile('shrimple.png').then(console.log).catch(console.error);
lens.scanByURL('https://lune.dimden.dev/7949f833fa42.png').then(console.log).catch(console.error); // this will fetch the image and then scan it
lens.scanByBuffer(Buffer.from('...')).then(console.log).catch(console.error);
```
All methods above return `{ language: String, text_segments: Array<String> }` object. Language is 2-letter ISO code, text_segments is an array of strings, each representing a line of text.

## Options
Options can be empty, or contain the following (default values):
```javascript
{
  chromeVersion: '121.0.6167.140', // Version of Chromium to "use"
  majorChromeVersion: '121', // Major version of Chromium to "use", should match the previous value
  sbisrc: 'Google Chrome 121.0.6167.140 (Official) Windows', // browser string to use, version should match the previous value
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', // user agent to use, version should match the previous value
  endpoint: LENS_ENDPOINT, // endpoint to use, probably should not be changed
  viewport: [1920, 1080], // viewport to use, probably should not be changed
  headers: {}, // you can add headers here, they'll override the default ones
}
```

## Custom Sharex OCR
1. Install Node.js LTS from https://nodejs.org/en  
2. Download this repo somewhere safe and extract it  
![screenshot](https://lune.dimden.dev/eaab7598004e.png)  
3. Go to the extracted folder and Shift+Right Click -> Open PowerShell window here  
4. Run `npm i` and wait for it to finish  
5. Now open Sharex window and go to Hotkey settings and create a new hotkey for "Capture region (Light)". Then open that hotkey setting menu and set Task like this:  
![screenshot](https://lune.dimden.dev/11f3777b3885.png)  
6. Now go to Actions and check "Override actions", then press Add... and set it up like this:  
![screenshot](https://lune.dimden.dev/fb8a14c1014f.png)  
Except instead of  
- `D:\Node.js\node.exe` you should put the path to your Node.js installation  
- `D:\JS\ChromeLensApi\` part you should put the path to the extracted folder (with `sharex.js` part included at the end).  
7. Save it, and make sure "lens" is checked. Now you can close the settings and setup the hotkey to your liking.
9. Now you can use your hotkey to capture a region and it will OCR it using Google Lens API.