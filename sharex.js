import clipboardy from 'clipboardy';
import Lens from './src/index.js';
import { sleep } from './src/utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

try {
    // get file path from command line
    const args = process.argv.slice(2);
    const file = args[0];

    // get path to cookies file (should be in the same directory as this script)
    const moduleUrl = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(moduleUrl);
    const pathToCookies = path.join(__dirname, 'cookies.json');

    // read cookies from file
    let cookies;
    if (fs.existsSync(pathToCookies)) {
        cookies = JSON.parse(fs.readFileSync(pathToCookies, 'utf8'));
    }

    // create lens instance
    const lens = new Lens({
        headers: {
            cookie: cookies
        }
    });

    // scan file
    const text = await lens.scanByFile(file);

    // write cookies to file
    fs.writeFileSync(pathToCookies, JSON.stringify(lens.cookies, null, 4));

    // write text to clipboard
    clipboardy.writeSync(text.segments.map(s => s.text).join('\n'));
} catch (e) {
    console.error('Error occurred:');
    console.error(e);
    await sleep(30000);
}
