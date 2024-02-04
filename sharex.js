import clipboardy from "clipboardy";
import Lens from "./src/index.js";
import { sleep } from "./src/utils.js";
import fs from "fs";
import path from "path";

try {
    // get file path from command line
    const args = process.argv.slice(2);
    const file = args[0];

    // get path to cookies file (should be in the same directory as this script)
    let moduleUrl = import.meta.url;
    if(moduleUrl.startsWith('file://')) {
        moduleUrl = moduleUrl.slice(7);
    }
    const __dirname = path.dirname(moduleUrl);
    let pathToCookies = path.join(__dirname, 'cookies.json');
    if(pathToCookies.match(/^\\[A-Z]:\\/)) {
        pathToCookies = pathToCookies.slice(1);
    }

    // read cookies from file
    let cookies;
    if(fs.existsSync(pathToCookies)) {
        cookies = JSON.parse(fs.readFileSync(pathToCookies, 'utf8'));
    }

    // create lens instance
    const lens = new Lens({
        headers: {
            'cookie': cookies
        }
    });

    // scan file
    const text = await lens.scanByFile(file);

    // write cookies to file
    fs.writeFileSync(pathToCookies, JSON.stringify(lens.cookies, null, 4));

    // write text to clipboard
    clipboardy.writeSync(text.text_segments.join("\n"));
} catch (e) {
    console.error("Error occurred:");
    console.error(e);
    await sleep(30000);
}