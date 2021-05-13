import React from 'react';
import PropTypes from 'prop-types';
import { ViewPropTypes } from 'react-native';
import AndroidMediaPlayer from './AndroidMediaPlayer';
import Video from 'react-native-video';
import Device from '../../../util/Device';

function MediaPlayer({ uri, style }) {
	if (Device.isAndroid()) return <AndroidMediaPlayer style={style} source={{ uri }} />;
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
	style: ViewPropTypes.style
};

MediaPlayer.defaultProps = {
	onError: () => null
};

export default MediaPlayer;
