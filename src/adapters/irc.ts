import { LiveChatAction } from '@util/types';
import { MessageAdapter } from '.';

export class IRCMessageAdapter extends MessageAdapter {
	public sockets = new Set<WebSocket>();

	transform(action: LiveChatAction<string>): string | undefined {
		throw new Error('Method not implemented.');
	}
}
