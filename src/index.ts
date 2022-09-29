import { IHTTPMethods, Router } from 'itty-router';
import { getChannel } from './routes/channel';
import { getStream } from './routes/stream';
import { notFound, Result } from './util/util';
export { YoutubeChat } from './YoutubeChat';

export interface Env {
	YOUTUBE_CHAT: DurableObjectNamespace;
}

function route(request: Request, env: Env): Promise<HandlerResult> {
	const router = Router<Request, IHTTPMethods>();

	router.get('/c/:id', getChannel);
	router.get('/s/:id', getStream);
	router.get('/v/:id', getStream);
	router.all('*', () => notFound);

	return router.handle(request, env);
}

const handler: ExportedHandler<Env> = {
	async fetch(request, env) {
		try {
			const result = await route(request, env);
			if (result.isOk()) {
				return result.value;
			} else {
				const [message, status] = result.error;
				return new Response(message, { status });
			}
		} catch (error) {
			console.error(error);
			if (error instanceof Response) {
				return error;
			} else {
				return new Response(String(error) || 'Internal Server Error', {
					status: 500,
				});
			}
		}
	},
};

export type Handler<T extends Record<string, string> = Record<string, string>> =
	(request: Request & { params: T }, env: Env) => Promise<HandlerResult>;
type HandlerResult = Result<Response, [string, number]>;

export default handler;
