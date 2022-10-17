import { Emote } from './emotes';
export interface SerializedMetadata {
	/**
	 * Youtube ID
	 */
	_: string;
	/**
	 * Display name
	 */
	a?: string;
	/**
	 * Subbed months
	 */
	b?: number;
	/**
	 * Name color
	 */
	c?: string;

	/**
	 * Encoded Emote indices
	 */
	d?: string;

	/**
	 * Spore badge slugs
	 */
	e?: string[];

	/**
	 * Has Spore Collectible
	 */
	f?: boolean;

	/**
	 * Spore Chat highlight message powerup color
	 */
	g?: string;
}

export interface SporeUserInfo {
	/**
	 * Youtube ID
	 */
	id?: string;

	/**
	 * Owned Emote slugs
	 */
	emotes?: string[];

	/**
	 * badges
	 */
	badges?: string[];

	/**
	 * Serialized Emotes for the Youtube emojiManager
	 */
	serializedEmotes?: Emote[];

	/**
	 * Spore Display name
	 */
	name?: string;

	/**
	 * Spore user months subbed
	 */
	subbedMonths?: number;

	/**
	 * hex color for name color
	 */
	nameColor?: string;
}

export type UserInfo = Omit<SerializedMetadata, '_' | 'f'>;

export type InfoMap = [string, UserInfo][];
