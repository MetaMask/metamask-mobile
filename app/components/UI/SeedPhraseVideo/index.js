import React from 'react';
import { StyleSheet, View } from 'react-native';
import Video, { TextTrackType } from 'react-native-video';
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
	// TODO: can we load this asset as local resource? (like above)
	'https://github.com/MetaMask/metamask-extension/blob/develop/app/images/videos/recovery-onboarding/subtitles-en.vtt';

const SeedPhraseVideo = () => {
	const onError = e => Logger.error(e, 'Video failed.');
	return (
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
				onError={onError}
				resizeMode="cover"
			/>
		</View>
	);
};

export default SeedPhraseVideo;
