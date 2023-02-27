import { ChatItemRenderer, LiveChatAction } from '@util/types';
import { parseYTString } from '@util/youtube';
import { MessageAdapter } from '.';

export type ChatEvent =
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
	  }
	| {
			type: 'membergift';
			id: string;
			recipient: {
				id: string;
				name: string;
			};
			gifter: string;
			unix: number;
	  };

function parseUnix(unix: string): number {
	return Math.round(Number(unix) / 1000);
}

export class SubathonMessageAdapter extends MessageAdapter {
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
			case 'liveChatSponsorshipsGiftRedemptionAnnouncementRenderer': {
				const renderer = action[rendererType];
				const messageRuns = renderer.message.runs;
				let gifter = 'Unknown';
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				if (messageRuns?.length === 2 && 'text' in messageRuns[1]!) {
					gifter = messageRuns[1].text;
				}
				return {
					type: 'membergift',
					id: renderer.id,
					recipient: {
						id: renderer.authorExternalChannelId,
						name: parseYTString(renderer.authorName),
					},
					gifter,
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
