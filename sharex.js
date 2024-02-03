import clipboardy from "clipboardy";
import Lens from "./index.js";

const args = process.argv.slice(2);
const file = args[0];

const lens = new Lens();

const text = await lens.scanByFile(file);

clipboardy.writeSync(text.text_segments.join("\n"));