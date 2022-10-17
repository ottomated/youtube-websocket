import { ChatItemRenderer, LiveChatAction } from '@util/types';
import { parseYTString } from '@util/youtube';
import { MessageAdapter } from '.';

export type ChatEvent = {
	type: 'message';
	id: string;
	message: string;
	author: {
		name: string;
		id: string;
		badges: {
			tooltip: string;
			type: 'icon' | 'custom';
			badge: string;
		}[];
	};
	unix: number;
};

export class JSONMessageAdapter extends MessageAdapter {
	public sockets = new Set<WebSocket>();

	transform(action: LiveChatAction): string | undefined {
		const parsed = this.parseAction(action);
		if (parsed) return JSON.stringify(parsed);
	}

	protected parseAction(data: LiveChatAction): ChatEvent | undefined {
		const actionType = Object.keys(data)[0] as keyof LiveChatAction;
		const action = data[actionType]?.item;
		if (!action) return;
		const rendererType = Object.keys(action)[0] as keyof ChatItemRenderer;
		switch (rendererType) {
			case 'liveChatTextMessageRenderer': {
				const renderer = action[rendererType];
				return {
					type: 'message',
					message: parseYTString(renderer.message),
					id: renderer.id,
					author: {
						id: renderer.authorExternalChannelId,
						name: parseYTString(renderer.authorName),
						badges:
							renderer.authorBadges?.map(
								({ liveChatAuthorBadgeRenderer: badge }) => ({
									tooltip: badge.tooltip,
									type: badge.icon ? 'icon' : 'custom',
									badge: badge.icon
										? badge.icon.iconType
										: badge.customThumbnail?.thumbnails?.[0]?.url ?? '',
								})
							) ?? [],
					},
					unix: Math.round(Number(renderer.timestampUsec) / 1000),
				};
			}
		}
	}
}
