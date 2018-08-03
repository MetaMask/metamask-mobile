import React from 'react';
import PropTypes from 'prop-types';
import { View, ViewPropTypes, TouchableNativeFeedback } from 'react-native';

const GenericButton = props => (
	<TouchableNativeFeedback
		delayPressIn={0}
		background={TouchableNativeFeedback.SelectableBackground()} // eslint-disable-line new-cap
	>
		<View style={props.style}>{props.children}</View>
	</TouchableNativeFeedback>
);

GenericButton.propTypes = {
	children: PropTypes.any,
	style: ViewPropTypes.style
};

export default GenericButton;
