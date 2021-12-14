import React from 'react';
import PropTypes from 'prop-types';
import { Text as RNText, StyleSheet } from 'react-native';
import { fontStyles, colors } from '../../styles/common';

const style = StyleSheet.create({
	text: {
		...fontStyles.normal,
		color: colors.textDefault,
		marginVertical: 2,
		fontSize: 14,
	},
	centered: {
		textAlign: 'center',
	},
	right: {
		textAlign: 'right',
	},
	red: {
		color: colors.red,
	},
	error: {
		color: colors.error,
	},
	orange: {
		color: colors.orange,
	},
	textDefault: {
		color: colors.textDefault,
	},
	textAlternative: {
		color: colors.textAlternative,
	},
	bold: fontStyles.bold,
	blue: {
		color: colors.primary,
	},
	green: {
		color: colors.green400,
	},
	primary: {
		color: colors.textDefault,
	},
	small: {
		fontSize: 12,
	},
	big: {
		fontSize: 16,
	},
	upper: {
		textTransform: 'uppercase',
	},
	disclaimer: {
		fontStyle: 'italic',
		letterSpacing: 0.15,
	},
	modal: {
		color: colors.textDefault,
		fontSize: 16,
		lineHeight: 22.4, // 1.4 * fontSize
	},
	infoModal: {
		lineHeight: 20,
		marginVertical: 6,
	},
	link: {
		color: colors.primary,
	},
	strikethrough: {
		textDecorationLine: 'line-through',
	},
	underline: {
		textDecorationLine: 'underline',
	},
	noMargin: {
		marginVertical: 0,
	},
});

const Text = ({
	reset,
	centered,
	right,
	bold,
	green,
	textDefault,
	textAlternative,
	blue,
	red,
	error,
	orange,
	primary,
	small,
	big,
	upper,
	modal,
	infoModal,
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
			blue && style.blue,
			red && style.red,
			error && style.error,
			orange && style.orange,
			textDefault && style.textDefault,
			textAlternative && style.textAlternative,
			primary && style.primary,
			disclaimer && [style.small, style.disclaimer],
			small && style.small,
			big && style.big,
			upper && style.upper,
			modal && style.modal,
			infoModal && style.infoModal,
			link && style.link,
			strikethrough && style.strikethrough,
			underline && style.underline,
			noMargin && style.noMargin,
			externalStyle,
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
	textDefault: false,
	textAlternative: false,
	blue: false,
	red: false,
	error: false,
	primary: false,
	disclaimer: false,
	modal: false,
	small: false,
	big: undefined,
	upper: false,
	link: false,
	strikethrough: false,
	underline: false,
	style: undefined,
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
	 * Sets the color to the textDefault of the theme
	 */
	textDefault: PropTypes.bool,
	/**
	 * Sets the color to the textAlternative of the theme
	 */
	textAlternative: PropTypes.bool,
	/**
	 * Makes text blue
	 */
	blue: PropTypes.bool,
	/**
	 * Makes text red
	 */
	red: PropTypes.bool,
	/**
	 * Makes text error color
	 */
	error: PropTypes.bool,
	/**
	 * Makes text orange
	 */
	orange: PropTypes.bool,
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
	 * Makes text with bigger line height
	 * Used in modals with information text
	 */
	infoModal: PropTypes.bool,
	/**
	 * Makes text small
	 */
	small: PropTypes.bool,
	/**
	 * Makes text big
	 */
	big: PropTypes.bool,
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
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default Text;
