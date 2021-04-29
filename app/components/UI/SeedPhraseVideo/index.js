import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TextTrackType } from 'react-native-video';
import VideoPlayer from 'react-native-video-controls';
import Logger from '../../../util/Logger';

const styles = StyleSheet.create({
	videoContainer: {
		position: 'relative',
		borderRadius: 8,
		overflow: 'hidden',
		width: '100%',
		height: 180,
		flex: 1
	}
});

// eslint-disable-next-line import/no-commonjs
const vid = require('../../../../app/videos/recovery-phrase.mp4');
const VTT_URI =
	'https://github.com/MetaMask/metamask-extension/blob/develop/app/images/videos/recovery-onboarding/subtitles-en.vtt';

const SeedPhraseVideo = () => {
	const onError = e => Logger.error(e, 'Video failed');
	const onPlay = () => Logger.log('User clicked play');
	return (
		<View style={styles.videoContainer}>
			<VideoPlayer
				paused // paused to start
				disableFullscreen
				disableBack
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
				onError={onError}
				onPlay={onPlay}
				resizeMode="cover"
			/>
		</View>
	);
};

export default SeedPhraseVideo;
