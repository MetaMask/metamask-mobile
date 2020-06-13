import React from 'react';
import PropTypes from 'prop-types';
import { Text, StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';

const style = StyleSheet.create({
	text: {
		fontSize: 18,
		marginTop: 3,
		marginBottom: 3,
		...fontStyles.bold
	},
	centered: {
		textAlign: 'center'
	},
	hero: {
		fontSize: 22,
		margin: 5
	}
});

const Title = ({ centered, hero, ...props }) => (
	<Text style={[style.text, centered && style.centered, hero && style.hero]} {...props} />
);

Title.defaultProps = {
	centered: false,
	hero: false
};

Title.propTypes = {
	centered: PropTypes.bool,
	hero: PropTypes.bool
};

export default Title;
