import { StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';

const styles = StyleSheet.create({
	container: {
		padding: 15,
		borderRadius: 100,
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
	roundedNormal: {
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: colors.blue,
		padding: 8
	},
	roundedNormalText: {
		color: colors.blue
	},
	normal: {
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: colors.blue
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
		borderWidth: 1,
		borderColor: colors.blue
	},
	cancelText: {
		color: colors.blue
	},
	warning: {
		backgroundColor: colors.red
	},
	info: {
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: colors.blue
	},
	warningText: {
		color: colors.white
	},
	neutral: {
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: colors.grey500
	},
	neutralText: {
		color: colors.grey500
	},
	sign: {
		backgroundColor: colors.blue,
		borderWidth: 1,
		borderColor: colors.blue
	},
	signText: {
		color: colors.white
	},
	danger: {
		backgroundColor: colors.red,
		borderColor: colors.red,
		borderWidth: 1
	},
	whiteText: {
		...fontStyles.bold,
		color: colors.white
	}
});

function getStyles(type) {
	let fontStyle, containerStyle;
	switch (type) {
		case 'orange':
			fontStyle = styles.orangeText;
			containerStyle = styles.orange;
			break;
		case 'blue':
			fontStyle = styles.blueText;
			containerStyle = styles.blue;
			break;
		case 'confirm':
			fontStyle = styles.confirmText;
			containerStyle = styles.confirm;
			break;
		case 'normal':
			fontStyle = styles.normalText;
			containerStyle = styles.normal;
			break;
		case 'rounded-normal':
			fontStyle = styles.roundedNormalText;
			containerStyle = styles.roundedNormal;
			break;
		case 'cancel':
			fontStyle = styles.cancelText;
			containerStyle = styles.cancel;
			break;
		case 'transparent':
			fontStyle = styles.whiteText;
			containerStyle = styles.transparent;
			break;
		case 'transparent-blue':
			fontStyle = styles.normalText;
			containerStyle = styles.transparent;
			break;
		case 'warning':
			fontStyle = styles.warningText;
			containerStyle = styles.warning;
			break;
		case 'warning-empty':
			fontStyle = styles.warningText;
			containerStyle = styles.transparent;
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
		case 'sign':
			fontStyle = styles.signText;
			containerStyle = styles.sign;
			break;
		default:
			throw new Error('Unknown button type');
	}

	return {
		fontStyle: [styles.text, fontStyle],
		containerStyle: [styles.container, containerStyle]
	};
}

export default getStyles;
