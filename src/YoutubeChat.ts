import { IHTTPMethods, Router } from 'itty-router';
import { Env } from '.';
import { Continuation, LiveChatResponse } from './util/types';
import { traverseJSON } from './util/util';
import {
	getContinuationToken,
	parseChatAction,
	VideoData,
} from './util/youtube';

type Handler = (request: Request) => Promise<Response>;

export async function createChatObject(
	videoId: string,
	videoData: VideoData,
	req: Request,
	env: Env
): Promise<Response> {
	const id = env.YOUTUBE_CHAT.idFromName(videoId);
	const object = env.YOUTUBE_CHAT.get(id);

	const init = await object.fetch('http://internal.do/init', {
		method: 'POST',
		body: JSON.stringify(videoData),
	});
	if (!init.ok) return init;

	return object.fetch('http://internal.do/ws', req);
}

const chatInterval = 250;

export class YoutubeChat implements DurableObject {
	private initialized = false;
	private router: Router<Request, IHTTPMethods>;
	private initialData!: VideoData['initialData'];
	private config!: VideoData['config'];
	private sockets = new Set<WebSocket>();
	private seenMessages = new Map<string, number>();

	constructor(private state: DurableObjectState, private env: Env) {
		const r = Router<Request, IHTTPMethods>();
		this.router = r;
		r.post('/init', this.init);
		r.get('/ws', this.handleWebsocket);
		r.all('*', () => new Response('Not found', { status: 404 }));
	}

	private broadcast<T>(data: T) {
		const message = JSON.stringify(data);
		for (const socket of this.sockets.values()) {
			socket.send(message);
		}
	}

	private init: Handler = async (req) => {
		if (this.initialized) return new Response();
		this.initialized = true;
		const data = await req.json<VideoData>();
		this.config = data.config;
		this.initialData = data.initialData;
		const continuation = traverseJSON(data.initialData, (value) => {
			if (value.title === 'Live chat') {
				return value.continuation as Continuation;
			}
		});

		if (!continuation)
			return new Response('Failed to load chat', { status: 404 });

		const token = getContinuationToken(continuation);
		if (!token) return new Response('Failed to load chat', { status: 404 });

		this.fetchChat(token);
		setInterval(() => this.clearSeenMessages(), 60 * 1000);

		return new Response();
	};

	private nextContinuationToken?: string;

	private async clearSeenMessages() {
		const cutoff = Date.now() - 1000 * 60;
		for (const message of this.seenMessages.entries()) {
			const [id, timestamp] = message;
			if (timestamp < cutoff) {
				this.seenMessages.delete(id);
			}
		}
	}

	private async fetchChat(continuationToken: string) {
		let nextToken = continuationToken;
		try {
			const res = await fetch(
				`https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?key=${this.config.INNERTUBE_API_KEY}`,
				{
					method: 'POST',
					body: JSON.stringify({
						context: this.config.INNERTUBE_CONTEXT,
						continuation: continuationToken,
						webClientInfo: { isDocumentHidden: false },
					}),
				}
			);
			if (!res.ok) {
				throw new Error(res.statusText);
			}
			const data = await res.json<LiveChatResponse>();
			const nextContinuation =
				data?.continuationContents?.liveChatContinuation?.continuations?.[0];
			nextToken =
				(nextContinuation
					? getContinuationToken(nextContinuation)
					: undefined) ?? continuationToken;

			const actions =
				data.continuationContents.liveChatContinuation.actions ?? [];

			for (const action of actions) {
				const parsed = parseChatAction(action);
				if (parsed) {
					if (this.seenMessages.has(parsed.id)) continue;
					this.seenMessages.set(parsed.id, parsed.unix);
					this.broadcast(parsed);
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			this.nextContinuationToken = nextToken;
			if (this.sockets.size > 0)
				setTimeout(() => this.fetchChat(nextToken), chatInterval);
		}
	}

	private handleWebsocket: Handler = async (req) => {
		if (req.headers.get('Upgrade') !== 'websocket')
			return new Response('Expected a websocket', { status: 400 });

		const pair = new WebSocketPair();
		const ws = pair[1];
		ws.accept();

		const wsResponse = new Response(null, {
			status: 101,
			webSocket: pair[0],
		});

		this.sockets.add(ws);
		if (this.nextContinuationToken) this.fetchChat(this.nextContinuationToken);

		ws.addEventListener('close', () => {
			this.sockets.delete(ws);
		});

		return wsResponse;
	};

	async fetch(req: Request): Promise<Response> {
		return this.router.handle(req);
	}
}
