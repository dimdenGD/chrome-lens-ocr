import Lens from './index.js';

const lens = new Lens();

lens.scanByFile('shrimple.png').then(t => {
    console.log(t);
}).catch(console.error);