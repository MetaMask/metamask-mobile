import React from 'react';
import PropTypes from 'prop-types';
import { View, ViewPropTypes } from 'react-native';
import AndroidMediaPlayer from './AndroidMediaPlayer';
import Video from 'react-native-video';
import Device from '../../../util/Device';

function MediaPlayer({ uri, style }) {
	return (
		<View style={style}>
			{Device.isAndroid() ? (
				<AndroidMediaPlayer source={{ uri }} />
			) : (
				<Video style={style} muted source={{ uri }} controls />
			)}
		</View>
	);
}

MediaPlayer.propTypes = {
	/**
	 * Media URI
	 */
	uri: PropTypes.string,
	/**
	 * Custom style object
	 */
	style: ViewPropTypes.style
};

MediaPlayer.defaultProps = {
	onError: () => null
};

export default MediaPlayer;
