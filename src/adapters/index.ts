import { LiveChatAction } from '@util/types';

export abstract class MessageAdapter {
	public static readonly hasState: boolean;

	public abstract readonly sockets: Set<WebSocket>;

	abstract transform(action: LiveChatAction): string | undefined;
}
