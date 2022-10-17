import { isTextRun, LiveChatAction } from '@util/types';
import { TruffleChatEvent } from '../truffle';

export enum EmoteProvider {
	Twitch,
	FFZ,
	BTTV,
	Custom,
	Spore,
}

type SporeFileExtensions =
	| 'png'
	| 'webp'
	| 'jpg'
	| 'jpeg'
	| 'gif'
	| 'svg'
	| 'mp4'
	| 'webm'
	| 'h264'
	| 'ogv'
	| 'mov'
	| 'obj'
	| 'mtl'
	| 'glb'
	| 'gltf'
	| 'json';

export type SporeEmote = {
	id: string;
	slug: string;
	bitIndex: number;
	channelId: string;
	ext: SporeFileExtensions;
};

export type Emote = {
	provider: EmoteProvider;
	id: string;
	name: string;
	ext?: string;
	bitIndex?: number;
	channelId?: string;
};

export function getEmoteImage(
	emote: Emote,
	apiBase: string
): string | undefined {
	if (emote.provider === EmoteProvider.Twitch) {
		return `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/static/dark/1.0`;
	} else if (emote.provider === EmoteProvider.FFZ) {
		return `https://cdn.frankerfacez.com/emote/${emote.id}/1`;
	} else if (emote.provider === EmoteProvider.BTTV) {
		return `https://cdn.betterttv.net/emote/${emote.id}/1x`;
	} else if (emote.provider === EmoteProvider.Spore && emote?.ext) {
		return `https://cdn.bio/ugc/collectible/${emote.id}.tiny.${emote.ext}`;
	} else if (emote.provider === EmoteProvider.Custom) {
		return `${apiBase}/emotes/${emote.id}`;
	} else {
		return undefined;
	}
}

const splitPattern = /[\s.,?!]/;
function splitWords(string: string): string[] {
	const result: string[] = [];
	let startOfMatch = 0;
	for (let i = 0; i < string.length - 1; i++) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		if (splitPattern.test(string[i]!) !== splitPattern.test(string[i + 1]!)) {
			result.push(string.substring(startOfMatch, i + 1));
			startOfMatch = i + 1;
		}
	}
	result.push(string.substring(startOfMatch));
	return result;
}

export function addEmotesToMessage(
	message: LiveChatAction[string]['item']['liveChatTextMessageRenderer'],
	getEmote: (name: string, userId: string) => string | undefined
): TruffleChatEvent['message'] {
	const userId = message.authorExternalChannelId;

	const runs: TruffleChatEvent['message'] = [];
	for (const run of message.message.runs ?? []) {
		if (isTextRun(run)) {
			const { text } = run;
			let index = 0;
			let startOfText = 0;
			const words = splitWords(text);
			let hasEmote = false;
			for (const word of words) {
				const emote =
					word === '🌝' ? getEmote('Kappa', userId) : getEmote(word, userId);
				if (emote) {
					hasEmote = true;
					if (index > 0) runs.push(text.substring(startOfText, index));
					runs.push({
						emoji: emote,
					});
					startOfText = index + word.length;
				}
				index += word.length;
			}
			if (hasEmote) {
				runs.push(text.substring(startOfText, index));
			} else {
				runs.push(run.text);
			}
		} else {
			// Handle Kappa
			if (run.emoji.emojiId === '🌝') {
				const emote = getEmote('Kappa', userId);
				if (emote) runs.push({ emoji: emote });
			} else if (isTextRun(run)) {
				runs.push(run.text);
			} else {
				runs.push({
					emoji: run.emoji.image.thumbnails[0]?.url ?? '',
				});
			}
		}
	}
	return runs;
}

export function decodeEmotes(
	encodedEmotes: string,
	emoteIndicesMap: Map<string, number[]>,
	preferCache = true
): number[] {
	const get = () => {
		const characters: number[] = [];
		for (let i = 0; i < encodedEmotes.length; i++) {
			characters[encodedEmotes.length - 1 - i] =
				encodedEmotes.charCodeAt(i) - 35;
		}
		const finalArray: number[] = [];
		for (let i = 0; i < characters.length; i++) {
			if (characters[i] === 0) continue;

			for (let bit = 0; bit < 6; bit++) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const bitMatches = (characters[i]! & (1 << bit)) !== 0;
				if (bitMatches) {
					finalArray.push(i * 6 + bit);
				}
			}
		}
		return finalArray;
	};

	if (preferCache) {
		const cachedValue = emoteIndicesMap.get(encodedEmotes);

		if (cachedValue) return cachedValue;

		const decodedValue = get();
		emoteIndicesMap.set(encodedEmotes, decodedValue);
		return decodedValue;
	} else {
		return get();
	}
}
