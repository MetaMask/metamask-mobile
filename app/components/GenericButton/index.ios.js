import React from 'react';
import PropTypes from 'prop-types';
import { ViewPropTypes, TouchableOpacity } from 'react-native';

const GenericButton = props => <TouchableOpacity style={props.style}>{props.children}</TouchableOpacity>;

GenericButton.propTypes = {
	children: PropTypes.any,
	style: ViewPropTypes.style
};

export default GenericButton;
