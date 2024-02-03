import Lens from './index.js';

const lens = new Lens();

lens.scanByURL('https://pbs.twimg.com/media/GFal9XeWkAADKh3.jpg?name=orig').then(t => {
    console.log(t);
}).catch(console.error);