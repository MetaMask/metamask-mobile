import React, { useState } from 'react';
import Video from 'react-native-video';
import PropTypes from 'prop-types';
import { View, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import Entypo from 'react-native-vector-icons/Entypo';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
	mutedIcon: {
		marginTop: -20
	}
});

function MediaPlayer({ uri, style, onError }) {
	const [muted, setMuted] = useState(true);

	const toggleMuted = () => setMuted(!muted);

	return (
		<View style={style}>
			<View>
				<Video
					source={{ uri }}
					ref={ref => {
						this.player = ref;
					}}
					onError={onError}
					style={style}
					muted={muted}
					repeat
				/>
				<TouchableWithoutFeedback onPress={toggleMuted}>
					<Entypo
						name={`sound${muted ? '-mute' : ''}`}
						size={20}
						color={colors.orange}
						style={styles.mutedIcon}
					/>
				</TouchableWithoutFeedback>
				<TouchableWithoutFeedback onPress={toggleMuted}>
					<Entypo
						name={`sound${muted ? '-mute' : ''}`}
						size={20}
						color={colors.orange}
						style={styles.mutedIcon}
					/>
				</TouchableWithoutFeedback>
			</View>
		</View>
	);
}

MediaPlayer.propTypes = {
	uri: PropTypes.string,
	style: PropTypes.object,
	onError: PropTypes.func
};

MediaPlayer.defaultProps = {
	onError: () => null
};

export default MediaPlayer;
