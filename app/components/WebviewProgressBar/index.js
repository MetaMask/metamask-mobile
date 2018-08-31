import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	bar: {
		height: 4,
		backgroundColor: colors.primary
	}
});

const WebviewProgressBar = props => {
	if (props.progress === 0 || props.progress === 1) {
		return null;
	}

	return <View style={[styles.bar, { width: `${props.progress * 100}%` }]} />;
};

WebviewProgressBar.propTypes = {
	/**
	 * Float that represents the progress complete
	 * between 0 and 1
	 */
	progress: PropTypes.any
};

export default WebviewProgressBar;
