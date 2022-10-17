import { LiveChatAction } from '@util/types';
import { parseYTString } from '@util/youtube';
import { getUsernameColor } from './hash';
import { UserInfo } from './users';

export type CustomBadge = {
	url: string;
	months?: number;
	slug?: string;
};

export type MonthBadge = Omit<Required<CustomBadge>, 'slug'>;
export type SporeBadge = Omit<Required<CustomBadge>, 'months'>;

export const isMonthBadge = (
	customBadge: CustomBadge | undefined
): customBadge is MonthBadge => {
	return customBadge?.months !== undefined;
};

export const isSporeBadge = (
	customBadge: CustomBadge | undefined
): customBadge is SporeBadge => {
	return customBadge?.slug !== undefined;
};

function getSporeUserBadges(
	userInfo: UserInfo | undefined,
	sporeYoutubeBadges: Map<string, string>
) {
	const youtubeBadges: string[] = [];

	if (userInfo) {
		const badges = new Set(userInfo?.e ?? []);

		for (const badgeSlug of badges) {
			const image = sporeYoutubeBadges.get(badgeSlug);

			if (image) {
				youtubeBadges.push(image);
			}
		}
	}

	return youtubeBadges;
}
type LiveChatTextMessageRenderer =
	LiveChatAction[string]['item']['liveChatTextMessageRenderer'];
function getUsername(
	message: LiveChatTextMessageRenderer,
	userInfo?: UserInfo
) {
	// Username
	if (userInfo?.a) {
		return decodeURIComponent(userInfo.a);
	}
	return parseYTString(message.authorName);
}
function getYoutubeBadges(
	message: LiveChatTextMessageRenderer,
	modBadgeImage: string
) {
	const badges: string[] = [];

	for (const badgeParent of message.authorBadges ?? []) {
		const badge = badgeParent.liveChatAuthorBadgeRenderer;

		if (badge.icon?.iconType === 'moderator') {
			badges.push(modBadgeImage);
		} else if (badge.customThumbnail?.thumbnails[0]) {
			badges.push(badge.customThumbnail?.thumbnails[0].url);
		}
	}
	return badges;
}

export function addAliasesToMessage(
	message: LiveChatTextMessageRenderer,
	users: Map<string, UserInfo>,
	sporeYoutubeBadges: Map<string, string>,
	modBadgeImage: string
) {
	const userInfo = users.get(message.authorExternalChannelId);
	const username = getUsername(message, userInfo);
	return {
		username,
		color: userInfo?.c ?? getUsernameColor(username),
		badges: [
			...getYoutubeBadges(message, modBadgeImage),
			...getSporeUserBadges(userInfo, sporeYoutubeBadges),
		],
	};
}
