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

function MediaReproductor({ uri, style }) {
	const [muted, setMuted] = useState(true);

	const onBuffer = () => console.log('s');
	const onError = () => console.log('s');
	const toggleMuted = () => setMuted(!muted);
	return (
		<View>
			<TouchableWithoutFeedback onPress={toggleMuted}>
				<View>
					<Video
						source={{ uri }}
						ref={ref => {
							this.player = ref;
						}}
						onBuffer={onBuffer}
						onError={onError}
						style={style}
						muted={muted}
					/>
					<Entypo
						name={`sound${muted ? '-mute' : ''}`}
						size={20}
						color={colors.orange}
						style={styles.mutedIcon}
					/>
				</View>
			</TouchableWithoutFeedback>
		</View>
	);
}

MediaReproductor.propTypes = {
	uri: PropTypes.string,
	style: PropTypes.object
};

export default MediaReproductor;
