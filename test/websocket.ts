import { WebSocket } from 'ws';
import { appendFile } from 'fs/promises';

const ws = new WebSocket(
	'wss://youtube-websocket.mogul-moves.workers.dev/v/tJC0YAOKZxc?adapter=raw'
);

ws.addEventListener('error', (ev) => {
	console.log(ev.message);
});

ws.addEventListener('open', () => {
	console.log('Connected');
});

ws.on('message', async (msg) => {
	const json = JSON.parse(msg.toString());
	console.log(json);
	await appendFile('./debug.out', msg.toString() + ',\n');
});
