import React from 'react';
import { StyleSheet, View } from 'react-native';
import Video, { TextTrackType } from 'react-native-video';

const styles = StyleSheet.create({
	videoContainer: {
		width: '100%',
		height: 200,
		flex: 1
	}
});

// eslint-disable-next-line import/no-commonjs
const vid = require('../../../../app/videos/placeholder.mp4');
const VTT_URI =
	'https://github.com/MetaMask/metamask-extension/blob/develop/app/images/videos/recovery-onboarding/subtitles-en.vtt';

const SeedPhraseVideo = () => (
	<View style={styles.videoContainer}>
		<Video
			source={vid}
			textTracks={[
				{
					title: 'English CC',
					language: 'en',
					type: TextTrackType.VTT,
					uri: VTT_URI
				}
			]}
			selectedTextTrack={{
				type: 'language',
				value: 'en'
			}}
			style={StyleSheet.absoluteFill}
			controls
			resizeMode={'contain'}
		/>
	</View>
);

export default SeedPhraseVideo;
