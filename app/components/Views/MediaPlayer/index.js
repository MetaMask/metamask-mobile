import React from 'react';
import PropTypes from 'prop-types';
import { ViewPropTypes, View } from 'react-native';
import AndroidMediaPlayer from './AndroidMediaPlayer';
import Video from 'react-native-video';
import Device from '../../../util/Device';

function MediaPlayer({ uri, style, onClose }) {
	if (Device.isAndroid())
		return (
			<View style={style}>
				<AndroidMediaPlayer onClose={onClose} source={{ uri }} />
			</View>
		);
	return <Video style={style} muted source={{ uri }} controls />;
}

MediaPlayer.propTypes = {
	/**
	 * Media URI
	 */
	uri: PropTypes.string,
	/**
	 * Custom style object
	 */
	style: ViewPropTypes.style,
	/**
	 * On close callback
	 */
	onClose: PropTypes.func
};

MediaPlayer.defaultProps = {
	onError: () => null
};

export default MediaPlayer;
