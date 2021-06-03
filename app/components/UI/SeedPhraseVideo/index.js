import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import AndroidMediaPlayer from '../../Views/MediaPlayer/AndroidMediaPlayer';
import { TextTracksType, Video } from 'react-native-video';
import Device from '../../../util/Device';
import Loader from '../../Views/MediaPlayer/Loader';
import scaling from '../../../util/scaling';

const styles = StyleSheet.create({
	videoContainer: {
		height: scaling.scale(240),
		width: '100%'
	},
	loaderContainer: {
		position: 'absolute',
		zIndex: 999,
		width: '100%',
		height: '100%'
	}
});

const subtitle_source_tracks = [
	{
		title: 'EN CC',
		language: 'en',
		type: TextTracksType.VTT,
		uri: 'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/subtitles-en.vtt'
	},
	{
		title: 'ES CC',
		language: 'es',
		type: TextTracksType.VTT,
		uri: 'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/subtitles-es.vtt'
	},
	{
		title: 'JA JP CC',
		language: 'ja-jp',
		type: TextTracksType.VTT,
		uri: 'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/subtitles-ja-jp.vtt'
	},
	{
		title: 'ID ID CC',
		language: 'id-id',
		type: TextTracksType.VTT,
		uri: 'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/subtitles-id-id.vtt'
	},
	{
		title: 'HI IN CC',
		language: 'id-id',
		type: TextTracksType.VTT,
		uri: 'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/subtitles-hi-in.vtt'
	},
	{
		title: 'KO KR CC',
		language: 'ko-kr',
		type: TextTracksType.VTT,
		uri: 'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/subtitles-ko-kr.vtt'
	},
	{
		title: 'PT BR CC',
		language: 'pt-br',
		type: TextTracksType.VTT,
		uri: 'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/subtitles-pt-br.vtt'
	},
	{
		title: 'RU RU CC',
		language: 'ru-ru',
		type: TextTracksType.VTT,
		uri: 'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/subtitles-ru-ru.vtt'
	},
	{
		title: 'VI VN CC',
		language: 'vi-vn',
		type: TextTracksType.VTT,
		uri: 'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/subtitles-vi-vn.vtt'
	},
	{
		title: 'TL CC',
		language: 'tl',
		type: TextTracksType.VTT,
		uri: 'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/subtitles-tl.vtt'
	}
];

const video_source_uri =
	'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/recovery-phrase.mp4?raw=true';

const SeedPhraseVideo = ({ style, onClose }) => {
	const [error, setError] = useState(false);
	const [loading, setLoading] = useState(true);

	const onLoad = useCallback(() => setLoading(false), [setLoading]);
	const onError = useCallback(() => setError(true), [setError]);

	return (
		<View style={styles.videoContainer}>
			{loading && (
				<View style={[styles.loaderContainer, style]}>
					<Loader error={error} onClose={onClose} />
				</View>
			)}
			{Device.isAndroid() ? (
				<AndroidMediaPlayer
					onLoad={onLoad}
					onError={onError}
					onClose={onClose}
					textTracks={subtitle_source_tracks}
					selectedTextTrack={{ type: 'title', value: 'EN CC' }}
					source={{ uri: video_source_uri }}
				/>
			) : (
				<Video
					onLoad={onLoad}
					onError={onError}
					style={style}
					muted
					source={{ uri: video_source_uri }}
					controls
					textTracks={subtitle_source_tracks}
					selectedTextTrack={{ type: 'title', value: 'EN CC' }}
					ignoreSilentSwitch="ignore"
				/>
			)}
		</View>
	);
};

SeedPhraseVideo.propTypes = {
	style: PropTypes.object,
	onClose: PropTypes.func
};

export default SeedPhraseVideo;
