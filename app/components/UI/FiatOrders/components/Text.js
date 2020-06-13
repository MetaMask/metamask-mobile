import React from 'react';
import PropTypes from 'prop-types';
import { Text as RNText, StyleSheet } from 'react-native';
import { fontStyles, colors } from '../../../../styles/common';

const style = StyleSheet.create({
	text: {
		...fontStyles.normal,
		color: colors.grey500,
		marginBottom: 2,
		marginTop: 2,
		fontSize: 14
	},
	centered: {
		textAlign: 'center'
	},
	right: {
		textAlign: 'right'
	},
	bold: fontStyles.bold,
	subHeader: {
		margin: 5
	},
	small: {
		fontSize: 12
	},
	disclaimer: {
		fontStyle: 'italic',
		letterSpacing: 0.15
	},
	modal: {
		color: colors.fontPrimary,
		fontSize: 16,
		lineHeight: 30
	},
	link: {
		color: colors.blue
	}
});

const Text = ({
	reset,
	centered,
	right,
	subHeader,
	bold,
	small,
	modal,
	disclaimer,
	link,
	style: externalStyle,
	...props
}) => (
	<RNText
		style={[
			!reset && style.text,
			centered && style.centered,
			right && style.right,
			bold && style.bold,
			subHeader && style.subHeader,
			disclaimer && [style.small, style.disclaimer],
			small && style.small,
			modal && style.modal,
			link && style.link,
			externalStyle
		]}
		{...props}
	/>
);

Text.defaultProps = {
	reset: false,
	centered: false,
	right: false,
	subHeader: false,
	bold: false,
	disclaimer: false,
	modal: false,
	small: false,
	link: false,
	style: undefined
};

Text.propTypes = {
	reset: PropTypes.bool,
	centered: PropTypes.bool,
	right: PropTypes.bool,
	subHeader: PropTypes.bool,
	bold: PropTypes.bool,
	disclaimer: PropTypes.bool,
	modal: PropTypes.bool,
	small: PropTypes.bool,
	link: PropTypes.bool,
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
};

export default Text;
