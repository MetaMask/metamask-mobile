import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import MediaPlayer from '../../Views/MediaPlayer';
import scaling from '../../../util/scaling';

const height = scaling.scale(240);

const styles = StyleSheet.create({
	videoContainer: {
		height,
		width: '100%'
	},
	mediaPlayer: {
		height
	}
});

const video_source_uri =
	'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/recovery-phrase.mp4?raw=true';

const SeedPhraseVideo = ({ style, onClose }) => (
	<View style={styles.videoContainer}>
		<MediaPlayer onClose={onClose} uri={video_source_uri} style={[styles.mediaPlayer, style]} />
	</View>
);

SeedPhraseVideo.propTypes = {
	style: PropTypes.object,
	onClose: PropTypes.func
};

export default SeedPhraseVideo;
