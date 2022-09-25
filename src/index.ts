import { IHTTPMethods, Router } from 'itty-router';
import { Result } from 'neverthrow';
import { getChannel } from './routes/channel';
import { getStream } from './routes/stream';
import { notFound } from './util/util';
export { YoutubeChat } from './YoutubeChat';

export interface Env {
	YOUTUBE_CHAT: DurableObjectNamespace;
}
export type Handler = (
	request: Request & { params: { id: string } },
	env: Env
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<Result<Response | any, [string, number]>>;
type HandlerResult = Result<Response, [string, number]>;

const handler: ExportedHandler<Env> = {
	async fetch(request, env) {
		let response: Response;
		try {
			const router = Router<Request, IHTTPMethods>();

			router.get('/c/:id', getChannel);
			router.get('/s/:id', getStream);
			router.all('*', () => notFound);

			const result: HandlerResult = await router.handle(request, env);
			if (result.isErr()) {
				const [message, status] = result.error;
				response = new Response(message, { status });
			} else {
				response = result.value;
			}
		} catch (error) {
			console.error(error);
			if (error instanceof Response) {
				response = error;
			} else {
				response = new Response(String(error) || 'Internal Server Error', {
					status: 500,
				});
			}
		}
		// response.headers.set('Access-Control-Allow-Origin', '*');
		return response;
	},
};

export default handler;
