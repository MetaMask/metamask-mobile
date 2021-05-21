import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { colors } from '../../../styles/common';
import Logger from '../../../util/Logger';
import scaling from '../../../util/scaling';
import Svg, { Circle, Path } from 'react-native-svg';
import { strings } from '../../../../locales/i18n';
import AndroidMediaPlayer from '../../Views/MediaPlayer/AndroidMediaPlayer';
import Video from 'react-native-video';
import Device from '../../../util/Device';
import Loader from '../../Views/MediaPlayer/Loader';

const styles = StyleSheet.create({
	videoContainer: {
		height: 240,
		width: '100%'
	},
	image: {
		alignSelf: 'center',
		marginTop: 30,
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
		borderRadius: 8,
		opacity: 0.2,
		width: '100%',
		height: '100%'
	},
	loaderContainer: {
		position: 'absolute',
		zIndex: 999,
		width: '100%'
	}
});

const FAILED_TO_LOAD_MSG = strings('app_settings.video_failed');

// eslint-disable-next-line import/no-commonjs
const explain_backup_seedphrase = require('../../../images/explain-backup-seedphrase.png');

const video_source_uri =
	'https://github.com/MetaMask/metamask-mobile/blob/develop/app/videos/recovery-phrase.mp4?raw=true';

const SeedPhraseVideo = ({ style }) => {
	const [isPlaying, setPlaying] = useState(false);
	const [error, setError] = useState(false);
	const [loading, setLoading] = useState(false);

	const reset = useCallback(() => setPlaying(false), [setPlaying]);
	const onLoad = useCallback(() => setLoading(false), [setLoading]);

	const onError = useCallback(
		e => {
			Logger.error(e, FAILED_TO_LOAD_MSG);
			setError(true);
			setPlaying(false);
		},
		[setError, setPlaying]
	);

	const onPlay = useCallback(() => {
		Logger.log('User clicked play');
		setPlaying(true);
		setLoading(true);
	}, [setPlaying]);

	return (
		<View style={style ? [styles.videoContainer, style] : styles.videoContainer}>
			{!isPlaying ? (
				<>
					{loading ? (
						<View style={[styles.loaderContainer, style]}>
							<Loader error={error} onClose={reset} />
						</View>
					) : (
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
					)}
				</>
			) : Device.isAndroid() ? (
				<AndroidMediaPlayer
					onLoad={onLoad}
					onError={onError}
					onClose={reset}
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
					ignoreSilentSwitch="ignore"
				/>
			)}
		</View>
	);
};

SeedPhraseVideo.propTypes = {
	style: PropTypes.object
};

export default SeedPhraseVideo;
