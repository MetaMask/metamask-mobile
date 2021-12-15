/**
 * Common styles and variables
 */

/**
 * Base colors
 * Should not be used anywhere else in the code base apart from theme files
 * This is the single source of truth for colors specific design tokens
 */
const baseColors = {
	white: '#ffffff',
	grey000: '#f2f3f4',
	grey100: '#d6d9dc',
	grey200: '#bbc0c5',
	grey300: '#9fa6ae',
	grey400: '#848c96',
	grey500: '#6a737d',
	grey600: '#5b5d67',
	grey700: '#3c3f42',
	grey800: '#24272a',
	grey900: '#141618',
	red000: '#fcf2f3',
	red100: '#f7d5d8',
	red200: '#f1b9be',
	red300: '#e88f97',
	red400: '#e06470',
	red500: '#d73a49',
	red600: '#b92534',
	red700: '#8e1d28',
	red800: '#64141c',
	red900: '#3a0c10',
	blue000: '#eaf6ff',
	blue100: '#a7d9fe',
	blue200: '#75c4fd',
	blue500: '#037dd6',
	blue600: '#0260a4',
	blue700: '#024272',
	green100: '#e6f9ea',
	green200: '#afecbd',
	green300: '#86e29b',
	green400: '#28a745',
	green500: '#28a745',
	green600: '#1e7e34',
	yellow000: '#fffdf8',
	yellow100: '#fefcde',
	yellow200: '#fff2c5',
	yellow300: '#ffeaa3',
	yellow400: '#ffdf70',
	yellow500: '#ffd33d',
	yellow600: '#ffc70a',
	orange000: '#fef5ef',
	orange300: '#faa66c',
	orange500: '#f66a0a',
	transparent: 'transparent',
};

/**
 * Map of color names to HEX values
 * Definitions
 * background - Colors starting with the word "background" are reserved for background elements that all other components sit on. Nothing can be behind a "background" color. Or a "background" color cannot be used for a component that sits on any other component
 * primary - the primary action color. Used for components that usually sit on top of a "background" color component
 * onPrimary - the color that is used for the component that sits on top of the primary color
 * state colors e.g. success, error, warning, all represent a state and should be used accordingly
 */

export const colors = {
	// Lightmode
	textDefault: baseColors.grey800,
	textAlternative: baseColors.grey600,
	backgroundDefault: baseColors.white,
	backgroundAlternative: baseColors.grey000,
	borderDefault: baseColors.grey100,
	muted: baseColors.grey100,
	// Darkmode
	// textDefault: baseColors.white,
	// textAlternative: baseColors.grey100,
	// backgroundDefault: baseColors.grey900,
	// backgroundAlternative: baseColors.grey800,
	// borderDefault: baseColors.grey400,
	// muted: baseColors.grey000,

	primary: baseColors.blue500,
	onPrimary: baseColors.white,
	info: baseColors.blue000,
	onInfo: baseColors.blue500,
	error: baseColors.red000,
	onError: baseColors.red500,
	success: baseColors.green100,
	onSuccess: baseColors.green500,
	warning: baseColors.yellow000,
	onWarning: baseColors.yellow600,
	inverse: baseColors.grey800,
	onInverse: baseColors.white,
	alert: 'rgba(0,0,0,.75)',
	onAlert: baseColors.white,
	// UI escape hatches for grey colors with no general purpose
	ui1: baseColors.grey000,
	onUi1: baseColors.grey800,
	ui2: baseColors.grey100,
	onUi2: baseColors.grey800,
	ui3: baseColors.grey200,
	onUi3: baseColors.white,
	ui4: baseColors.grey500,
	onUi4: baseColors.white,
	shadowColor: baseColors.gray900,
	// needs auditing
	transparent: 'transparent',
};

/**
 * Map of reusable base styles
 */
export const baseStyles = {
	flexGrow: {
		flex: 1,
	},
	flexStatic: {
		flex: 0,
	},
};

/**
 * Map of reusable fonts
 */
export const fontStyles = {
	normal: {
		fontFamily: 'EuclidCircularB-Regular',
		fontWeight: '400',
	},
	light: {
		fontFamily: 'EuclidCircularB-Regular',
		fontWeight: '300',
	},
	thin: {
		fontFamily: 'EuclidCircularB-Regular',
		fontWeight: '100',
	},
	bold: {
		fontFamily: 'EuclidCircularB-Bold',
		fontWeight: '600',
	},
};
