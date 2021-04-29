import React, { useState } from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { TextTrackType } from 'react-native-video';
import VideoPlayer from 'react-native-video-controls';
import { colors } from '../../../styles/common';
import Logger from '../../../util/Logger';
import scaling from '../../../util/scaling';
import Svg, { Circle, Path } from 'react-native-svg';

const styles = StyleSheet.create({
	videoContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative',
		borderRadius: 8,
		overflow: 'hidden',
		width: '100%',
		height: 180
	},
	image: {
		zIndex: 0,
		width: scaling.scale(138),
		height: scaling.scale(162)
	},
	cover: {
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1,
		position: 'absolute',
		left: 0,
		top: 0,
		backgroundColor: colors.grey,
		opacity: 0.3,
		width: '100%',
		height: '100%'
	}
});

// eslint-disable-next-line import/no-commonjs
const explain_backup_seedphrase = require('../../../images/explain-backup-seedphrase.png');

// eslint-disable-next-line import/no-commonjs
const vid = require('../../../../app/videos/recovery-phrase.mp4');
const VTT_URI =
	'https://github.com/MetaMask/metamask-extension/blob/develop/app/images/videos/recovery-onboarding/subtitles-en.vtt';

const SeedPhraseVideo = () => {
	const [isPlaying, setPlaying] = useState(false);
	const onError = e => Logger.error(e, 'Video failed');
	const onPlay = () => {
		Logger.log('User clicked play');
		setPlaying(true);
	};

	return (
		<View style={styles.videoContainer}>
			{!isPlaying ? (
				<>
					<TouchableOpacity style={styles.cover} onPress={onPlay}>
						<Svg
							width="311"
							height="176"
							viewBox="0 0 311 176"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<Circle cx="156" cy="88" r="43" fill="white" fill-opacity="0.7" />
							<Path
								d="M185 87.5L140.75 107.852L140.75 67.1484L185 87.5Z"
								fill="black"
								fill-opacity="0.3"
							/>
						</Svg>
					</TouchableOpacity>
					<Image
						source={explain_backup_seedphrase}
						style={styles.image}
						resizeMethod="auto"
						testID={'carousel-one-image'}
					/>
				</>
			) : (
				<VideoPlayer
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
			)}
		</View>
	);
};

export default SeedPhraseVideo;
