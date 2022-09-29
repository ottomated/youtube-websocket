import { err } from 'neverthrow';
import { Json, JsonObject } from './types';

export const notFound = err<never, [string, number]>(['Not Found', 404]);

export const youtubeHeaders = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
};

export function traverseJSON<T>(
	obj: Json,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	callback: (value: any, key: string | number) => T | undefined
): T | undefined {
	if (!obj) return;
	if (typeof obj === 'object') {
		const entries = Object.entries(obj);
		for (const [key, value] of entries) {
			const itemResult = callback(value, key);
			if (itemResult) return itemResult;
			const subResult = traverseJSON(value, callback);
			if (subResult) return subResult;
		}
	}
}

export function isObject(obj: unknown): obj is JsonObject {
	return typeof obj === 'object' && !Array.isArray(obj);
}
