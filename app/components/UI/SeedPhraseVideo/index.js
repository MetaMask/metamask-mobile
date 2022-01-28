import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import MediaPlayer from '../../Views/MediaPlayer';
import { TextTrackType } from 'react-native-video';
import scaling from '../../../util/scaling';
import { strings } from '../../../../locales/i18n';

const HEIGHT = scaling.scale(240);

const styles = StyleSheet.create({
	videoContainer: {
		height: HEIGHT,
		width: '100%',
	},
	mediaPlayer: {
		height: HEIGHT,
	},
});

const SeedPhraseVideo = ({ style, onClose }) => {
	const video_source_uri =
		'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/recovery-phrase.mp4?raw=true';

	const subtitle_source_tracks = [
		{
			index: 0,
			title: strings('secret_phrase_video_subtitle.title'),
			language: strings('secret_phrase_video_subtitle.language'),
			type: TextTrackType.VTT,
			uri: strings('secret_phrase_video_subtitle.uri'),
		},
	];

	return (
		<View style={styles.videoContainer}>
			<MediaPlayer
				onClose={onClose}
				uri={video_source_uri}
				style={[styles.mediaPlayer, style]}
				textTracks={subtitle_source_tracks}
				selectedTextTrack={{ type: 'index', value: 0 }}
			/>
		</View>
	);
};

SeedPhraseVideo.propTypes = {
	style: PropTypes.object,
	onClose: PropTypes.func,
};

export default SeedPhraseVideo;
