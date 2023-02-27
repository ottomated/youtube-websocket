import type { Err, Ok } from 'neverthrow';
import { Env } from '..';

export type Continuation<T extends string = string> = {
	[key in T]: {
		continuation: string;
		clickTrackingParams: string;
	};
};

export type LiveChatResponse = {
	continuationContents?: {
		liveChatContinuation: {
			continuations?: Continuation[];
			actions?: LiveChatAction[];
		};
	};
};

export type TextRun = {
	text: string;
	bold?: boolean;
	italics?: boolean;
};
export type EmojiRun = {
	emoji: {
		emojiId: string;
		shortcuts: string[];
		searchTerms: string[];
		image: YTImage;
		isCustomEmoji?: boolean;
	};
};

export function isTextRun(run: unknown): run is TextRun {
	return (run as TextRun)?.text !== undefined;
}

export type YTString = {
	simpleText?: string;
	runs?: (TextRun | EmojiRun)[];
};
export type YTImage = {
	thumbnails: {
		height?: number;
		width?: number;
		url: string;
	}[];
	accessibility?: {
		accessibilityData: {
			label: string;
		};
	};
	webThumbnailDetailsExtensionData?: {
		isPreloaded: boolean;
	};
};
export type ChatItemRenderer = {
	liveChatPaidMessageRenderer: {
		id: string;
		timestampUsec: string;
		authorName: YTString;
		authorPhoto: YTImage;
		purchaseAmountText: YTString;
		message: YTString;
		headerBackgroundColor: number;
		headerTextColor: number;
		bodyBackgroundColor: number;
		bodyTextColor: number;
		authorExternalChannelId: string;
		authorNameTextColor: number;
		timestampColor: number;
		textInputBackgroundColor: number;
	};
	liveChatTickerPaidMessageItemRenderer: {
		id: string;
		amount: YTString;
		amountTextColor: number;
		startBackgroundColor: number;
		endBackgroundColor: number;
		authorPhoto: YTImage;
		durationSec: number;
		authorExternalChannelId: string;
		fullDurationSec: number;
	};
	liveChatMembershipItemRenderer: {
		id: string;
		timestampUsec: string;
		authorExternalChannelId: string;
		headerSubtext: YTString;
		authorName: YTString;
		authorPhoto: YTImage;
		authorBadges: YTBadge[];
	};
	liveChatTickerSponsorItemRenderer: {
		id: string;
		detailText: YTString;
		detailTextColor: number;
		startBackgroundColor: number;
		endBackgroundColor: number;
		sponsorPhoto: YTImage;
		durationSec: number;
		authorExternalChannelId: string;
		fullDurationSec: number;
	};
	liveChatTextMessageRenderer: {
		id: string;
		message: YTString;
		authorName: YTString;
		authorPhoto: YTImage;
		timestampUsec: string;
		authorExternalChannelId: string;
		authorBadges?: YTBadge[];
	};
	liveChatAutoModMessageRenderer: unknown;
	liveChatLegacyPaidMessageRenderer: unknown;
	liveChatPaidStickerRenderer: unknown;
	liveChatDonationAnnouncementRenderer: unknown;
	liveChatModeChangeMessageRenderer: unknown;
	liveChatModerationMessageRenderer: unknown;
	liveChatPlaceholderItemRenderer: unknown;
	liveChatPurchasedProductMessageRenderer: unknown;
	liveChatSponsorshipsGiftPurchaseAnnouncementRenderer: unknown;
	liveChatSponsorshipsGiftRedemptionAnnouncementRenderer: {
		id: string;
		timestampUsec: string;
		authorExternalChannelId: string;
		authorName: YTString;
		authorPhoto: YTImage;
		message: YTString;
	};
	liveChatViewerEngagementMessageRenderer: unknown;
	liveChatTickerPaidStickerItemRenderer: unknown;
};

export type YTBadge = {
	liveChatAuthorBadgeRenderer: {
		customThumbnail?: YTImage;
		icon?: {
			iconType: 'VERIFIED' | 'MODERATOR' | string;
		};
		tooltip: string;
		accessibility: {
			accessibilityData: {
				label: string;
			};
		};
	};
};

export type LiveChatAction<Action extends string = string> = {
	[action in Action]: {
		item: ChatItemRenderer;
	};
} & {
	clickTrackingParams?: string;
};

export type Handler<T extends Record<string, string> = Record<string, string>> =
	(request: Request & { params: T }, env: Env) => Promise<HandlerResult>;
export type HandlerResult = Result<Response, [string, number]>;

export type Result<T, E> = Ok<T, unknown> | Err<unknown, E>;

export type Json = JsonPrimitive | JsonArray | JsonObject;
type JsonPrimitive = null | boolean | number | string;
type JsonArray = Json[];
export type JsonObject = {
	[key: string]: Json;
};
