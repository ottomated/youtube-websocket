import { err, ok } from 'neverthrow';
import { Handler } from '..';
import { notFound, traverseJSON } from '../util/util';
import { getVideoData } from '../util/youtube';
import { createChatObject } from '../YoutubeChat';

export const getChannel: Handler<{ id: string }> = async (request, env) => {
	if (!request.params.id) return notFound;

	const urls = getChannelLiveUrl(request.params.id);

	const videoData = await getVideoData(urls);
	if (videoData.isErr()) return videoData;

	const { initialData } = videoData.value;

	const videoId = traverseJSON(initialData, (value, key) => {
		if (key === 'currentVideoEndpoint') {
			return value?.watchEndpoint?.videoId;
		}
	});

	if (!videoId) return err(['Stream not found', 404]);

	const res = await createChatObject(videoId, videoData.value, request, env);
	return ok(res);
};

function getChannelLiveUrl(channelId: string) {
	const isId = /^UC.{22}$/.test(channelId);
	let urlParts: string[];
	if (isId) urlParts = ['channel', 'c', 'user'];
	else urlParts = ['c', 'user', 'channel'];
	return urlParts.map(
		(part) => `https://www.youtube.com/${part}/${channelId}/live`
	);
}
