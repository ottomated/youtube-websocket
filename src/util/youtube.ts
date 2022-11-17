import { Err, err, Ok, ok } from 'neverthrow';
import {
	Continuation,
	isTextRun,
	Json,
	JsonObject,
	Result,
	YTString,
} from './types';
import { youtubeHeaders } from './util';

export type VideoData = {
	initialData: Json;
	config: YTConfig;
};

export type YTConfig = {
	INNERTUBE_API_KEY: string;
	INNERTUBE_CONTEXT: Json;
} & JsonObject;
export async function getVideoData(
	urls: string[]
): Promise<Ok<VideoData, unknown> | Err<unknown, [string, number]>> {
	let response: Response | undefined;
	for (const url of urls) {
		response = await fetch(url, {
			headers: youtubeHeaders,
		});
		if (response.ok) break;
	}
	if (!response || response.status === 404)
		return err(['Stream not found', 404]);
	if (!response.ok)
		return err([
			'Failed to fetch stream: ' + response.statusText,
			response.status,
		]);

	const text = await response.text();

	const initialData = getMatch(
		text,
		/(?:window\s*\[\s*["']ytInitialData["']\s*\]|ytInitialData)\s*=\s*({.+?})\s*;/
	);
	if (initialData.isErr()) return initialData;
	const config = getMatch<YTConfig>(text, /(?:ytcfg.set)\(({[\s\S]+?})\)\s*;/);
	if (config.isErr()) return config;

	if (!config.value.INNERTUBE_API_KEY || !config.value.INNERTUBE_CONTEXT)
		return err(['Failed to load YouTube context', 500]);

	return ok({ initialData: initialData.value, config: config.value });
}

function getMatch<T extends Json = Json>(
	html: string,
	pattern: RegExp
): Result<T, [string, number]> {
	const match = pattern.exec(html);
	if (!match?.[1]) return err(['Failed to find video data', 404]);
	try {
		return ok(JSON.parse(match[1]));
	} catch {
		return err(['Failed to parse video data', 404]);
	}
}

export function getContinuationToken(continuation: Continuation) {
	const key = Object.keys(continuation)[0] as keyof Continuation;
	return continuation[key]?.continuation;
}

export function parseYTString(string?: YTString): string {
	if (!string) return '';
	if (string.simpleText) return string.simpleText;
	if (string.runs)
		return string.runs
			.map((run) => {
				if (isTextRun(run)) {
					return run.text;
				} else {
					if (run.emoji.isCustomEmoji) {
						return ` ${
							run.emoji.image.accessibility?.accessibilityData?.label ??
							run.emoji.searchTerms[1] ??
							run.emoji.searchTerms[0]
						} `;
					} else {
						return run.emoji.emojiId;
					}
				}
			})
			.join('')
			.trim();
	return '';
}
