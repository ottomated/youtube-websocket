import { WebSocket } from 'ws';
import { appendFile } from 'fs/promises';

const ws = new WebSocket('ws://localhost:8787/c/LudwigAhgren?adapter=raw');

ws.addEventListener('error', (ev) => {
	console.log(ev.message);
});

ws.addEventListener('open', () => {
	console.log('Connected');
});

ws.on('message', async (msg) => {
	// const json = JSON.parse(msg.toString());
	// if (json.type !== 'message') console.log(json);
	await appendFile('./debug.out', msg.toString() + ',\n');
});
