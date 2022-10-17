import { ChatItemRenderer, LiveChatAction } from '@util/types';
import { Env } from 'src';
import { MessageAdapter } from '.';
import {
	addAliasesToMessage,
	CustomBadge,
	isSporeBadge,
} from './truffle/aliases';
import {
	addEmotesToMessage,
	decodeEmotes,
	Emote,
	EmoteProvider,
	getEmoteImage,
} from './truffle/emotes';
import { InfoMap, UserInfo } from './truffle/users';

export type TruffleChatEvent = {
	type: 'message';
	id: string;
	message: (string | { emoji: string })[];
	author: {
		name: string;
		color: string;
		id: string;
		badges: string[];
	};
	unix: number;
};

export class TruffleMessageAdapter extends MessageAdapter {
	public sockets = new Set<WebSocket>();

	constructor(private env: Env, private youtubeChannelId: string) {
		super();
		this.fetchAll();
	}

	private emoteMap = new Map<
		string,
		{ image: string; isSporeEmote: boolean }
	>();
	private encodedEmoteMap = new Map<string, number>();
	private emoteIndicesMap = new Map<string, number[]>();
	private users = new Map<string, UserInfo>();
	private sporeYoutubeBadges = new Map<string, string>();

	private lastFetched = Date.now();
	async fetchAll() {
		this.lastFetched = Date.now();
		fetch(`${this.env.TRUFFLE_API_BASE}/gateway/emotes`)
			.then((res) => res.json<Emote[]>())
			.then((body) => {
				for (const emote of body) {
					const image = getEmoteImage(emote, this.env.TRUFFLE_API_BASE);
					if (!image) continue;
					if (image) {
						this.emoteMap.set(emote.name, {
							image,
							isSporeEmote: emote.provider === EmoteProvider.Spore,
						});

						if (emote.bitIndex !== undefined) {
							this.encodedEmoteMap.set(emote.name, emote.bitIndex);
						}
					}
				}
			});
		fetch(
			`${this.env.TRUFFLE_API_BASE}/gateway/users/c/${this.youtubeChannelId}`
		)
			.then((res) => res.json<InfoMap>())
			.then((body) => {
				this.users = new Map(body);
			});
		fetch(`${this.env.TRUFFLE_API_BASE}/gateway/badges`)
			.then((res) => res.json<CustomBadge[]>())
			.then((body) => {
				const sporeBadges = body.filter(isSporeBadge);

				for (const badge of sporeBadges) {
					this.sporeYoutubeBadges.set(badge.slug, badge.url);
				}
			});
	}

	transform(action: LiveChatAction): string | undefined {
		if (this.lastFetched < Date.now() - 1000 * 60) {
			this.fetchAll();
		}
		const parsed = this.parseAction(action);
		if (parsed) return JSON.stringify(parsed);
	}

	protected parseAction(data: LiveChatAction): TruffleChatEvent | undefined {
		const actionType = Object.keys(data)[0] as keyof LiveChatAction;
		const action = data[actionType]?.item;
		if (!action) return;
		const rendererType = Object.keys(action)[0] as keyof ChatItemRenderer;
		switch (rendererType) {
			case 'liveChatTextMessageRenderer': {
				const renderer = action[rendererType];
				const { badges, username, color } = addAliasesToMessage(
					renderer,
					this.users,
					this.sporeYoutubeBadges,
					'https://overlay.truffle.vip/mod.png'
				);
				return {
					type: 'message',
					message: addEmotesToMessage(renderer, (name, userId) => {
						const emote = this.emoteMap.get(name);
						const user = this.users.get(userId);
						/**
						 * For spore emotes, we are defaulting to rendering the emote. It will only not render
						 * the emote if the user spore emote map is cached on the client and the user doesn't own the emote.
						 * If the message is from a non-extension user, it will not render a spore emote
						 */
						if (emote?.isSporeEmote) {
							if (user) {
								const encodedUserEmotes = user?.d;

								if (encodedUserEmotes) {
									const emoteIndex = this.encodedEmoteMap.get(name);
									const decodedUserEmoteIndices = decodeEmotes(
										encodedUserEmotes,
										this.emoteIndicesMap,
										true
									);

									// if the user has an emote cache but doesn't own the emote, don't render the emote.
									if (
										emoteIndex !== undefined &&
										!decodedUserEmoteIndices.includes(emoteIndex)
									) {
										return undefined;
									}
								}
							}
						}
						return emote?.image;
					}),
					id: renderer.id,
					author: {
						id: renderer.authorExternalChannelId,
						color,
						name: username,
						badges,
					},
					unix: Math.round(Number(renderer.timestampUsec) / 1000),
				};
			}
		}
	}
}
