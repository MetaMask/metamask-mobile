import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import AndroidMediaPlayer from '../../Views/MediaPlayer/AndroidMediaPlayer';
import Video, { TextTrackType } from 'react-native-video';
import Device from '../../../util/Device';
import Loader from '../../Views/MediaPlayer/Loader';
import scaling from '../../../util/scaling';
import { strings } from '../../../../locales/i18n';

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
		title: strings('secret_phrase_video_subtitle.title'),
		language: strings('secret_phrase_video_subtitle.language'),
		type: TextTrackType.VTT,
		uri: strings('secret_phrase_video_subtitle.uri')
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
					source={{ uri: video_source_uri }}
					text_tracks={subtitle_source_tracks}
					selected_text={{ type: 'index', value: 0 }}
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
					selectedTextTrack={{ type: 'index', value: 0 }}
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
