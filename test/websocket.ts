import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:8787/v/vmS9vNbtssw');

ws.addEventListener('error', (ev) => {
	console.log(ev.message);
});

ws.addEventListener('open', () => {
	console.log('Connected');
});

ws.on('message', (msg) => {
	console.log(msg.toString());
});
