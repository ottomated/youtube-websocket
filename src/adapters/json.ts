import { ChatItemRenderer, LiveChatAction } from '@util/types';
import { parseYTString } from '@util/youtube';
import { MessageAdapter } from '.';

export type ChatEvent =
	| {
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
	  }
	| {
			type: 'member';
			id: string;
			author: {
				id: string;
				name: string;
			};
			unix: number;
	  }
	| {
			type: 'superchat';
			id: string;
			message: string;
			amount: {
				// cents: number;
				text: string;
			};
			author: {
				name: string;
				id: string;
			};
			unix: number;
	  };

function parseUnix(unix: string): number {
	return Math.round(Number(unix) / 1000);
}

export class JSONMessageAdapter extends MessageAdapter {
	public sockets = new Set<WebSocket>();

	transform(action: LiveChatAction): string | undefined {
		const parsed = this.parseAction(action);
		if (parsed) return JSON.stringify(parsed);
	}

	protected parseAction(data: LiveChatAction): ChatEvent | undefined {
		delete data.clickTrackingParams;
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
					unix: parseUnix(renderer.timestampUsec),
				};
			}
			case 'liveChatMembershipItemRenderer': {
				const renderer = action[rendererType];
				return {
					type: 'member',
					id: renderer.id,
					author: {
						id: renderer.authorExternalChannelId,
						name: parseYTString(renderer.authorName),
					},
					unix: parseUnix(renderer.timestampUsec),
				};
			}
			case 'liveChatPaidMessageRenderer': {
				const renderer = action[rendererType];
				return {
					type: 'superchat',
					id: renderer.id,
					message: parseYTString(renderer.message),
					author: {
						id: renderer.authorExternalChannelId,
						name: parseYTString(renderer.authorName),
					},
					amount: {
						// cents: renderer.purchaseAmountMicros / 1000000,
						text: parseYTString(renderer.purchaseAmountText),
					},
					unix: parseUnix(renderer.timestampUsec),
				};
			}
			// default: {
			// 	console.log(rendererType, action[rendererType]);
			// 	return;
			// }
		}
	}
}
