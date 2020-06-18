import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import { fontStyles, colors } from '../../styles/common';
import Text from './Text.js';

const style = StyleSheet.create({
	text: {
		fontSize: 18,
		marginTop: 3,
		marginBottom: 3,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	hero: {
		fontSize: 22
	},
	centered: {
		textAlign: 'center'
	}
});

const Title = ({ centered, hero, style: externalStyle, ...props }) => (
	<Text style={[style.text, centered && style.centered, hero && style.hero, externalStyle]} {...props} />
);

Title.defaultProps = {
	centered: false,
	hero: false,
	style: undefined
};

Title.propTypes = {
	centered: PropTypes.bool,
	hero: PropTypes.bool,
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
};

export default Title;
