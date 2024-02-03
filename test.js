import Lens from './index.js';

const lens = new Lens();

lens.scanByURL('https://pbs.twimg.com/media/GFanmpxWIAAMmMw.jpg?name=orig').then(t => {
    console.log(t);
}).catch(console.error);