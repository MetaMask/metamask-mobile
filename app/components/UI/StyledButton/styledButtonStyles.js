import { StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';

const styles = StyleSheet.create({
	container: {
		padding: 15,
		borderRadius: 6,
		justifyContent: 'center'
	},
	text: {
		fontSize: 14,
		textAlign: 'center',
		...fontStyles.bolder,
		fontWeight: 'bold'
	},
	blue: {
		backgroundColor: colors.blue
	},
	blueText: {
		color: colors.white
	},
	orange: {
		backgroundColor: colors.blue
	},
	orangeText: {
		color: colors.white
	},
	infoText: {
		color: colors.blue
	},
	confirm: {
		backgroundColor: colors.blue,
		minHeight: 50
	},
	confirmText: {
		color: colors.white
	},
	confirmPressed: {
		backgroundColor: colors.blue600,
		minHeight: 50
	},
	roundedNormal: {
		backgroundColor: colors.white,
		borderWidth: 2,
		borderColor: colors.blue,
		padding: 8
	},
	roundedNormalText: {
		color: colors.blue
	},
	normal: {
		backgroundColor: colors.white,
		borderWidth: 2,
		borderColor: colors.blue200
	},
	normalText: {
		color: colors.blue
	},
	transparent: {
		backgroundColor: colors.transparent,
		borderWidth: 0,
		borderColor: colors.transparent
	},
	cancel: {
		backgroundColor: colors.white,
		borderWidth: 2,
		borderColor: colors.grey200
	},
	cancelText: {
		color: colors.grey500
	},
	warning: {
		backgroundColor: colors.white,
		borderWidth: 2,
		borderColor: colors.red
	},
	info: {
		backgroundColor: colors.white,
		borderWidth: 2,
		borderColor: colors.blue
	},
	warningText: {
		color: colors.red
	},
	neutral: {
		backgroundColor: colors.white,
		borderColor: colors.grey200
	},
	neutralText: {
		color: colors.grey200
	},
	neutralPressed: {
		backgroundColor: colors.white,
		borderColor: colors.grey500
	},
	danger: {
		backgroundColor: colors.red,
		borderColor: colors.red,
		borderWidth: 2
	},
	whiteText: {
		...fontStyles.bold,
		color: colors.white
	}
});

function getStyles(type) {
	let fontStyle, containerStyle, containerPressedStyle;
	switch (type) {
		case 'orange':
			fontStyle = styles.orangeText;
			containerStyle = styles.orange;
			break;
		case 'blue':
			fontStyle = styles.blueText;
			containerStyle = styles.blue;
			break;
		case 'primary':
			fontStyle = styles.confirmText;
			containerStyle = styles.confirm;
			containerPressedStyle = styles.confirmPressed;
			break;
		case 'normal':
			fontStyle = styles.normalText;
			containerStyle = styles.normal;
			break;
		case 'rounded-normal':
			fontStyle = styles.roundedNormalText;
			containerStyle = styles.roundedNormal;
			break;
		case 'default':
			fontStyle = styles.cancelText;
			containerStyle = styles.cancel;
			containerPressedStyle = styles.neutralPressed;
			break;
		case 'transparent':
			fontStyle = styles.whiteText;
			containerStyle = styles.transparent;
			break;
		case 'warning':
			fontStyle = styles.warningText;
			containerStyle = styles.warning;
			break;
		case 'info':
			fontStyle = styles.infoText;
			containerStyle = styles.info;
			break;
		case 'neutral':
			fontStyle = styles.neutralText;
			containerStyle = styles.neutral;
			break;
		case 'danger':
			fontStyle = styles.confirmText;
			containerStyle = styles.danger;
			break;
		default:
			throw new Error('Unknown button type');
	}

	return {
		fontStyle: [styles.text, fontStyle],
		containerStyle: [styles.container, containerStyle],
		containerPressedStyle: [styles.container, containerPressedStyle]
	};
}

export default getStyles;
