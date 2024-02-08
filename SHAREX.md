## Custom Sharex OCR
It's possible to use this package with Sharex to OCR images using Google Lens API, instead of bad default OCR in Sharex. Here's how to do it:  
  
0. Get [Sharex](https://getsharex.com/) if you don't have it already.
1. Install Node.js LTS from https://nodejs.org/en (make sure to check "Add to PATH" during installation)  
2. Download this repo somewhere safe and extract it  
![screenshot](https://lune.dimden.dev/eaab7598004e.png)  
3. Go to the extracted folder and Shift+Right Click -> Open PowerShell window here  
4. Run `npm install` and wait for it to finish  
5. Now open Sharex window and go to Hotkey settings and create a new hotkey for "Capture region (Light)". Then open that hotkey setting menu and set Task like this:  
![screenshot](https://lune.dimden.dev/11f3777b3885.png)  
6. Now go to Actions and check "Override actions", then press Add... and set it up like this:  
![screenshot](https://lune.dimden.dev/fb8a14c1014f.png)  
Except instead of  
- `D:\Node.js\node.exe` you should put the path to your Node.js installation  
- `D:\JS\ChromeLensApi\` part you should put the path to the extracted folder (with `sharex.js` part included at the end).  
7. Save it, and make sure "lens" is checked. Now you can close the settings and setup the hotkey to your liking.
9. Now you can use your hotkey to capture a region and it will OCR it using Google Lens API (once it shows screenshot on your screen, text should be copied to your clipboard).
  
![gif](https://lune.dimden.dev/1bf28abae5b0.gif)

## Troubleshooting
If it takes a long time to show image and at the end doesn't copy anything for you, there might be some error happening in `sharex.js` script. You can turn off "Hidden window" in "lens" Action settings and run the hotkey again to see the error.  