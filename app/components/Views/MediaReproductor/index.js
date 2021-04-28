import React from 'react';
import Video from 'react-native-video';
import PropTypes from 'prop-types';

function MediaReproductor({ uri, style }) {
	const onBuffer = () => console.log('s');
	const onError = () => console.log('s');
	return (
		<Video
			source={{ uri }}
			ref={ref => {
				this.player = ref;
			}}
			onBuffer={onBuffer}
			onError={onError}
			style={style}
		/>
	);
}

MediaReproductor.propTypes = {
	uri: PropTypes.string,
	style: PropTypes.object
};

export default MediaReproductor;
