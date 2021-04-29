import React from 'react';
import PropTypes from 'prop-types';
import { View } from 'react-native';
import AndroidMediaPlayer from './AndroidMediaPlayer';

// const styles = StyleSheet.create({

// });

function MediaPlayer({ uri, style }) {
	return (
		<View style={[style]}>
			<AndroidMediaPlayer source={{ uri }} />
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
