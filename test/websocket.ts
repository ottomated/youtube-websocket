import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:8787/c/Myth_YT?adapter=truffle');

ws.addEventListener('error', (ev) => {
	console.log(ev.message);
});

ws.addEventListener('open', () => {
	console.log('Connected');
});

ws.on('message', (msg) => {
	console.log(msg.toString());
});
