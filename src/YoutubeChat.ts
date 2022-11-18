import { IHTTPMethods, Router } from 'itty-router';
import { Env } from '.';
import {
	ChatItemRenderer,
	Continuation,
	LiveChatAction,
	LiveChatResponse,
} from '@util/types';
import { traverseJSON } from '@util/util';
import { getContinuationToken, VideoData } from '@util/youtube';
import { MessageAdapter } from './adapters';
import { JSONMessageAdapter } from './adapters/json';
import { IRCMessageAdapter } from './adapters/irc';
import { RawMessageAdapter } from './adapters/raw';
import { TruffleMessageAdapter } from './adapters/truffle';
import { SubathonMessageAdapter } from './adapters/subathon';

const adapterMap: Record<
	string,
	(env: Env, channelId: string) => MessageAdapter
> = {
	json: () => new JSONMessageAdapter(),
	irc: () => new IRCMessageAdapter(),
	truffle: (env, channelId) => new TruffleMessageAdapter(env, channelId),
	subathon: () => new SubathonMessageAdapter(),
	raw: () => new RawMessageAdapter(),
};

type Handler = (request: Request) => Promise<Response>;

export async function createChatObject(
	videoId: string,
	videoData: VideoData,
	req: Request,
	env: Env
): Promise<Response> {
	const id = env.YOUTUBE_CHAT.idFromName(videoId);
	const object = env.YOUTUBE_CHAT.get(id);

	const init = await object.fetch('http://youtube.chat/init', {
		method: 'POST',
		body: JSON.stringify(videoData),
	});
	if (!init.ok) return init;

	const url = new URL(req.url);

	return object.fetch('http://youtube.chat/ws' + url.search, req);
}

const chatInterval = 250;

export class YoutubeChat implements DurableObject {
	private router: Router<Request, IHTTPMethods>;
	private channelId!: string;
	private initialData!: VideoData['initialData'];
	private config!: VideoData['config'];
	private seenMessages = new Map<string, number>();

	constructor(private state: DurableObjectState, private env: Env) {
		const r = Router<Request, IHTTPMethods>();
		this.router = r;
		r.post('/init', this.init);
		r.get('/ws', this.handleWebsocket);
		r.all('*', () => new Response('Not found', { status: 404 }));
	}

	private broadcast(data: LiveChatAction) {
		for (const adapter of this.adapters.values()) {
			const transformed = adapter.transform(data);
			if (!transformed) continue;
			for (const socket of adapter.sockets) {
				socket.send(transformed);
			}
		}
	}

	private initialized = false;
	private init: Handler = (req) => {
		return this.state.blockConcurrencyWhile(async () => {
			if (this.initialized) return new Response();
			this.initialized = true;
			const data = await req.json<VideoData>();
			this.config = data.config;
			this.initialData = data.initialData;
			this.channelId = traverseJSON(this.initialData, (value, key) => {
				if (key === 'channelNavigationEndpoint') {
					return value.browseEndpoint?.browseId;
				}
			});
			const continuation = traverseJSON(data.initialData, (value) => {
				if (value.title === 'Live chat') {
					return value.continuation as Continuation;
				}
			});

			if (!continuation) {
				this.initialized = false;
				return new Response('Failed to load chat', {
					status: 404,
				});
			}

			const token = getContinuationToken(continuation);
			if (!token) {
				this.initialized = false;
				return new Response('Failed to load chat', {
					status: 404,
				});
			}

			this.fetchChat(token);
			setInterval(() => this.clearSeenMessages(), 60 * 1000);

			return new Response();
		});
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
				data.continuationContents?.liveChatContinuation.continuations?.[0];
			nextToken =
				(nextContinuation
					? getContinuationToken(nextContinuation)
					: undefined) ?? continuationToken;

			// if data.continuationContents is undefined the stream is probably over
			const actions =
				data.continuationContents?.liveChatContinuation.actions ?? [];

			for (const action of actions) {
				const id = this.getId(action);
				if (id) {
					if (this.seenMessages.has(id)) continue;
					this.seenMessages.set(id, Date.now());
				}
				this.broadcast(action);

				// const parsed = parseChatAction(action);
				// if (parsed) {
				// 	if (this.seenMessages.has(parsed.id)) continue;
				// 	this.seenMessages.set(parsed.id, parsed.unix);
				// 	this.broadcast(parsed);
				// }
			}
		} catch (e) {
			console.error(e);
		} finally {
			this.nextContinuationToken = nextToken;
			if (this.adapters.size > 0)
				setTimeout(() => this.fetchChat(nextToken), chatInterval);
		}
	}

	private getId(data: LiveChatAction) {
		delete data.clickTrackingParams;
		const actionType = Object.keys(data)[0] as keyof LiveChatAction;
		const action = data[actionType]?.item;
		if (!action) return;
		const rendererType = Object.keys(action)[0] as keyof ChatItemRenderer;
		const renderer = action[rendererType] as { id: string };
		return renderer.id;
	}

	private adapters = new Map<string, MessageAdapter>();

	private makeAdapter(adapterType: string): MessageAdapter {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const adapterFactory = adapterMap[adapterType] ?? adapterMap.json!;

		const cached = this.adapters.get(adapterType);
		if (cached) return cached;

		const adapter = adapterFactory(this.env, this.channelId);
		this.adapters.set(adapterType, adapter);
		return adapter;
	}

	private handleWebsocket: Handler = async (req) => {
		if (req.headers.get('Upgrade') !== 'websocket')
			return new Response('Expected a websocket', { status: 400 });

		const url = new URL(req.url);
		const adapterType = url.searchParams.get('adapter') ?? 'json';

		const pair = new WebSocketPair();
		const ws = pair[1];
		ws.accept();

		const wsResponse = new Response(null, {
			status: 101,
			webSocket: pair[0],
		});

		const adapter = this.makeAdapter(adapterType);
		adapter.sockets.add(ws);
		if (this.nextContinuationToken) this.fetchChat(this.nextContinuationToken);

		ws.addEventListener('close', () => {
			adapter.sockets.delete(ws);
			if (adapter.sockets.size === 0) this.adapters.delete(adapterType);
		});

		return wsResponse;
	};

	async fetch(req: Request): Promise<Response> {
		return this.router.handle(req);
	}
}
