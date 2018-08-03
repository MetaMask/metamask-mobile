import React from 'react';
import PropTypes from 'prop-types';
import { ViewPropTypes, StyleSheet } from 'react-native';
import GenericButton from '../GenericButton'; // eslint-disable-line import/no-unresolved
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	button: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.primary,
		paddingVertical: 10,
		paddingHorizontal: 15,
		height: 40,
		borderRadius: 4
	}
});

const Button = props => <GenericButton style={[styles.button, props.style]}>{props.children}</GenericButton>;

Button.propTypes = {
	children: PropTypes.any,
	style: ViewPropTypes.style
};

export default Button;
