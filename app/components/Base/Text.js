import React from 'react';
import PropTypes from 'prop-types';
import { Text as RNText, StyleSheet } from 'react-native';
import { fontStyles, colors } from '../../styles/common';

const style = StyleSheet.create({
	text: {
		...fontStyles.normal,
		color: colors.grey600,
		marginVertical: 2,
		fontSize: 14
	},
	centered: {
		textAlign: 'center'
	},
	right: {
		textAlign: 'right'
	},
	red: {
		color: colors.red
	},
	black: {
		color: colors.black
	},
	bold: fontStyles.bold,
	blue: {
		color: colors.blue
	},
	green: {
		color: colors.green400
	},
	primary: {
		color: colors.fontPrimary
	},
	small: {
		fontSize: 12
	},
	upper: {
		textTransform: 'uppercase'
	},
	disclaimer: {
		fontStyle: 'italic',
		letterSpacing: 0.15
	},
	modal: {
		color: colors.fontPrimary,
		fontSize: 16,
		lineHeight: 16 * 1.4
	},
	link: {
		color: colors.blue
	},
	strikethrough: {
		textDecorationLine: 'line-through'
	},
	underline: {
		textDecorationLine: 'underline'
	},
	noMargin: {
		marginVertical: 0
	}
});

const Text = ({
	reset,
	centered,
	right,
	bold,
	green,
	black,
	blue,
	red,
	primary,
	small,
	upper,
	modal,
	disclaimer,
	link,
	strikethrough,
	underline,
	style: externalStyle,
	noMargin,
	...props
}) => (
	<RNText
		style={[
			!reset && style.text,
			centered && style.centered,
			right && style.right,
			bold && style.bold,
			green && style.green,
			black && style.black,
			blue && style.blue,
			red && style.red,
			black && style.black,
			primary && style.primary,
			disclaimer && [style.small, style.disclaimer],
			small && style.small,
			upper && style.upper,
			modal && style.modal,
			link && style.link,
			strikethrough && style.strikethrough,
			underline && style.underline,
			noMargin && style.noMargin,
			externalStyle
		]}
		{...props}
	/>
);

Text.defaultProps = {
	reset: false,
	centered: false,
	right: false,
	bold: false,
	green: false,
	black: false,
	blue: false,
	red: false,
	primary: false,
	disclaimer: false,
	modal: false,
	small: false,
	upper: false,
	link: false,
	strikethrough: false,
	underline: false,
	style: undefined
};

Text.propTypes = {
	/**
	 * Removes teh default style
	 */
	reset: PropTypes.bool,
	/**
	 * Align text to center
	 */
	centered: PropTypes.bool,
	/**
	 * Align text to right
	 */
	right: PropTypes.bool,
	/**
	 * Makes text bold
	 */
	bold: PropTypes.bool,
	/**
	 * Makes text green
	 */
	green: PropTypes.bool,
	/**
	 * Makes text black
	 */
	black: PropTypes.bool,
	/**
	 * Makes text blue
	 */
	blue: PropTypes.bool,
	/**
	 * Makes text red
	 */
	red: PropTypes.bool,
	/**
	 * Makes text fontPrimary color
	 */
	primary: PropTypes.bool,
	/**
	 * Makes text italic and tight
	 * used in disclaimers
	 */
	disclaimer: PropTypes.bool,
	/**
	 * Makes text black and bigger
	 * Used in modals
	 */
	modal: PropTypes.bool,
	/**
	 * Makes text small
	 */
	small: PropTypes.bool,
	/**
	 * Makes text uppercase
	 */
	upper: PropTypes.bool,
	/**
	 * Applies a link style
	 */
	link: PropTypes.bool,
	/**
	 * Applies a strikethrough decoration
	 */
	strikethrough: PropTypes.bool,
	/**
	 * Applies a underline decoration
	 */
	underline: PropTypes.bool,
	/**
	 * Removes the vertical margin
	 */
	noMargin: PropTypes.bool,
	/**
	 * Any other external style defined in props will be applied
	 */
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
};

export default Text;
