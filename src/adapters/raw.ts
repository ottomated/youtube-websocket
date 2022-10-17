import { LiveChatAction } from '@util/types';
import { MessageAdapter } from '.';

export class RawMessageAdapter extends MessageAdapter {
	public sockets = new Set<WebSocket>();

	transform(action: LiveChatAction): string | undefined {
		return JSON.stringify(action);
	}
}
