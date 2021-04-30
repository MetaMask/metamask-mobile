import React from 'react';
import PropTypes from 'prop-types';
import { View } from 'react-native';
import AndroidMediaPlayer from './AndroidMediaPlayer';
import Video from 'react-native-video';
import Device from '../../../util/Device';

function MediaPlayer({ uri, style }) {
	return (
		<View style={[style]}>
			{Device.isAndroid() ? (
				<AndroidMediaPlayer source={{ uri }} />
			) : (
				<Video style={style} source={{ uri }} controls />
			)}
		</View>
	);
}

MediaPlayer.propTypes = {
	uri: PropTypes.string,
	style: PropTypes.object
	// onError: PropTypes.func
};

MediaPlayer.defaultProps = {
	onError: () => null
};

export default MediaPlayer;
