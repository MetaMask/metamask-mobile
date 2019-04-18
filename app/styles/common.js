/**
 * Common styles and variables
 */

/**
 * Map of color names to HEX values
 */
export const colors = {
	grey500: '#6a737d',
	grey400: '#848c96',
	grey200: '#bbc0c5',
	grey100: '#d6d9dc',
	grey000: '#f2f3f4',

	red: '#D73A49',
	red000: '#fcf2f3',

	blue: '#037dd6',
	blue000: '#eaf6ff',

	fontPrimary: '#000000',
	fontSecondary: '#999999',
	fontTertiary: '#AAAAAA',
	fontError: '#D73A49',
	fontWarning: '#f66a0a',

	black: '#000000',

	green600: '#1e7e34',
	green500: '#28a745',
	green300: '#86e29b',
	green200: '#afecbd',

	primaryFox: '#f66a0a',

	slate: '#dfe4ea',
	tar: '#2f3542',
	title: '#1B344D',
	white: '#FFFFFF',
	yellow: '#F8D66D',
	yellowBorder: '#ECD391',
	warningText: '#735710',
	lightSuccess: '#eafad7',
	warning: '#CA810A',
	lightWarning: '#FFF2DB',
	dimmed: '#00000080',
	transparent: 'transparent',
	overlay: 'rgba(0,0,0,.5)',
	darkAlert: 'rgba(0,0,0,.75)',
	normalAlert: 'rgba(55,55,55,.97)',
	androidStatusbar: '#EBEBED',
	switchOffColor: '#B3B3B3',
	blueishGrey: '#e9eff5',
	pager: '#DADADA',
	modalDragGrey: '#C4C4C4',
	spinnerColor: '#F758AC',
	spinnerBackground: `rgba(185, 156, 171, 0.396)`
};

/**
 * Map of reusable base styles
 */
export const baseStyles = {
	flexGrow: {
		flex: 1
	},
	flexStatic: {
		flex: 0
	}
};

/**
 * Map of reusable fonts
 */
export const fontStyles = {
	normal: {
		fontFamily: 'Roboto',
		fontWeight: '400'
	},
	light: {
		fontFamily: 'Roboto',
		fontWeight: '300'
	},
	thin: {
		fontFamily: 'Roboto',
		fontWeight: '100'
	},
	bold: {
		fontFamily: 'Roboto',
		fontWeight: '600'
	}
};
