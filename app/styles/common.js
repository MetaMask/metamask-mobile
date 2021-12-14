/**
 * Common styles and variables
 */

/**
 * Base colors
 * Should not be used anywhere else in the code base apart from theme files
 * This is the single source of truth for colors specific design tokens
 */
const baseColors = {
	white: '#FFFFFF',
	grey000: '#f2f3f4',
	grey100: '#d6d9dc',
	grey200: '#bbc0c5',
	grey300: '#9fa6ae',
	grey400: '#848c96',
	grey500: '#6a737d',
	grey600: '#5B5D67',
	grey700: '#3C3F42',
	grey800: '#24272A',
	grey900: '#141618',
	red000: '#fcf2f3',
	red100: '#F7D5D8',
	red200: '#F1B9BE',
	red300: '#E88F97',
	red400: '#E06470',
	red500: '#D73A49',
	red600: '#B92534',
	red700: '#8E1D28',
	red800: '#64141C',
	red900: '#3A0C10',
	blue000: '#EAF6FF',
	blue100: '#A7D9FE',
	blue200: '#75C4FD',
	blue500: '#037DD6',
	blue600: '#0260A4',
	blue700: '#024272',
	green100: '#e6f9ea',
	green200: '#afecbd',
	green300: '#86e29b',
	green400: '#28A745',
	green500: '#28a745',
	green600: '#1e7e34',
	yellow700: '#705700',
	yellow200: '#ffe281',
	yellow300: '#FFD33D',
	yellow100: '#fffcdb',
	orange000: '#fef5ef',
	orange300: '#faa66c',
	orange500: '#F66A0A',
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
	textDefault: baseColors.grey800,
	textAlternative: baseColors.grey600,
	backgroundDefault: baseColors.white,
	backgroundAlternative: baseColors.gray000,
	primary: baseColors.blue500,
	onPrimary: baseColors.white,
	success: baseColors.green500,
	onSuccess: baseColors.white,
	error: baseColors.red500,
	onError: baseColors.white,
	warning: baseColors.orange500,
	onWarning: baseColors.white,
	inverse: baseColors.grey800,
	onInverse: baseColors.white,
	alert: 'rgba(0,0,0,.75)',
	onAlert: baseColors.white,
	// UI escape hatches for grey colors with no general purpose
	ui4: baseColors.grey500,
	onUi4: baseColors.white,
	ui3: baseColors.grey200,
	onUi3: baseColors.white,
	ui2: baseColors.grey100,
	onUi2: baseColors.grey800,
	ui1: baseColors.grey000,
	onUi1: baseColors.grey800,
	borderDefault: baseColors.grey100,
	shadowColor: baseColors.gray900,
	// needs auditing
	greyAssetVisibility: '#6A737D',
	grey450: '#8E8E93',
	grey700: '#3C3F42',
	grey600: '#5B5D67',
	grey500: '#6a737d',
	grey400: '#848c96',
	grey300: '#9fa6ae',
	grey200: '#bbc0c5',
	grey100: '#d6d9dc',
	grey050: '#D8D8D8',
	grey000: '#f2f3f4',
	greytransparent: 'rgba(36, 41, 46, 0.6)',
	greytransparent100: 'rgba(115, 115, 115, 0.5)',
	grey: '#333333',
	red: '#D73A49',
	red000: '#fcf2f3',
	blue: '#037dd6',
	blue000: '#eaf6ff',
	blue100: baseColors.blue100,
	blue200: '#75C4FD',
	blue500: '#1097FB',
	blue600: '#0260A4',
	blue700: '#0074C8',
	green600: '#1e7e34',
	green500: '#28a745',
	green400: '#28A745',
	green300: '#86e29b',
	green200: '#afecbd',
	green100: '#e6f9ea',
	yellow: '#FFD33D',
	yellowWarningBorder: '#FADF83',
	yellowWarningIcon: '#F8C000',
	yellow700: '#705700',
	yellow200: '#ffe281',
	yellow300: '#FFD33D',
	yellow100: '#fffcdb',
	orange: baseColors.orange500,
	orange300: '#faa66c',
	orange000: '#fef5ef',
	spinnerColor: '#037DD6',
	dimmed: '#00000080',
	transparent: 'transparent',
	lightOverlay: 'rgba(0,0,0,.2)',
	overlay: 'rgba(0,0,0,.5)',
	darkAlert: 'rgba(0,0,0,.75)',
	normalAlert: 'rgba(55,55,55,.97)',
	spinnerBackground: `rgba(185, 156, 171, 0.396)`,
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
