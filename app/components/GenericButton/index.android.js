import React from 'react';
import PropTypes from 'prop-types';
import { View, TouchableNativeFeedback } from 'react-native';

const GenericButton = props => (
	<TouchableNativeFeedback
		delayPressIn={0}
		background={TouchableNativeFeedback.SelectableBackground()} // eslint-disable-line new-cap
		{...props}
	>
		<View>{props.children}</View>
	</TouchableNativeFeedback>
);

GenericButton.propTypes = {
	children: PropTypes.any
};

export default GenericButton;
