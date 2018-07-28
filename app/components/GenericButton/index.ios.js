import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity } from 'react-native';

const GenericButton = props => <TouchableOpacity {...props}>{props.children}</TouchableOpacity>;

GenericButton.propTypes = {
	children: PropTypes.any
};

export default GenericButton;
