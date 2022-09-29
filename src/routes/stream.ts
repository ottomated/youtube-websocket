import { ok } from 'neverthrow';
import { Handler } from '@util/types';
import { notFound } from '@util/util';
import { getVideoData } from '@util/youtube';
import { createChatObject } from '../YoutubeChat';

export const getStream: Handler<{ id: string }> = async (request, env) => {
	if (!request.params.id) return notFound;

	if (!/^[A-Za-z0-9_-]{11}$/.test(request.params.id)) return notFound;
	const url = `https://www.youtube.com/watch?v=${request.params.id}`;

	const videoData = await getVideoData([url]);
	if (videoData.isErr()) return videoData;

	const res = await createChatObject(
		request.params.id,
		videoData.value,
		request,
		env
	);
	return ok(res);
};
