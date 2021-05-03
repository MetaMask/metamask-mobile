import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
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
		opacity: 0.2,
		width: '100%',
		height: '100%'
	}
});

// eslint-disable-next-line import/no-commonjs
const explain_backup_seedphrase = require('../../../images/explain-backup-seedphrase.png');

// eslint-disable-next-line import/no-commonjs
const vid = require('../../../../app/videos/recovery-phrase.mp4');

const SeedPhraseVideo = ({ style }) => {
	const [isPlaying, setPlaying] = useState(false);
	const onError = e => Logger.error(e, 'Video failed');
	const onPlay = () => {
		Logger.log('User clicked play');
		setPlaying(true);
	};

	return (
		<View style={style ? [styles.videoContainer, style] : styles.videoContainer}>
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
							<Circle cx="156" cy="88" r="43" fill="white" />
							<Path d="M185 87.5L140.75 107.852L140.75 67.1484L185 87.5Z" fill="black" />
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
					style={StyleSheet.absoluteFill}
					onError={onError}
					onPlay={onPlay}
					resizeMode="cover"
				/>
			)}
		</View>
	);
};

SeedPhraseVideo.propTypes = {
	style: PropTypes.object
};

export default SeedPhraseVideo;
