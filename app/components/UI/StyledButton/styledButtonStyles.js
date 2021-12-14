import { StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';

const styles = StyleSheet.create({
	container: {
		padding: 15,
		borderRadius: 100,
		justifyContent: 'center',
	},
	text: {
		fontSize: 14,
		textAlign: 'center',
		...fontStyles.bold,
	},
	blue: {
		backgroundColor: colors.primary,
	},
	blueText: {
		color: colors.onPrimary,
	},
	orange: {
		borderColor: colors.orange,
		borderWidth: 1,
	},
	orangeText: {
		color: colors.orange,
	},
	infoText: {
		color: colors.primary,
	},
	confirm: {
		backgroundColor: colors.primary,
		minHeight: 50,
	},
	confirmText: {
		color: colors.onPrimary,
	},
	roundedNormal: {
		backgroundColor: colors.backgroundDefault,
		borderWidth: 1,
		borderColor: colors.primary,
		padding: 8,
	},
	roundedNormalText: {
		color: colors.primary,
	},
	normal: {
		backgroundColor: colors.backgroundDefault,
		borderWidth: 1,
		borderColor: colors.primary,
	},
	normalText: {
		color: colors.primary,
	},
	transparent: {
		backgroundColor: colors.transparent,
		borderWidth: 0,
		borderColor: colors.transparent,
	},
	cancel: {
		backgroundColor: colors.backgroundDefault,
		borderWidth: 1,
		borderColor: colors.textAlternative,
	},
	cancelText: {
		color: colors.textAlternative,
	},
	signingCancel: {
		backgroundColor: colors.backgroundDefault,
		borderWidth: 1,
		borderColor: colors.primary,
	},
	signingCancelText: {
		color: colors.primary,
	},
	warning: {
		backgroundColor: colors.onError,
	},
	info: {
		backgroundColor: colors.backgroundDefault,
		borderWidth: 1,
		borderColor: colors.primary,
	},
	warningText: {
		color: colors.onWarning,
	},
	warningTextEmpty: {
		color: colors.warning,
	},
	neutral: {
		backgroundColor: colors.backgroundDefault,
		borderWidth: 1,
		borderColor: colors.borderDefault,
	},
	neutralText: {
		color: colors.textAlternative,
	},
	sign: {
		backgroundColor: colors.primary,
		borderWidth: 1,
		borderColor: colors.primary,
	},
	signText: {
		color: colors.onPrimary,
	},
	danger: {
		backgroundColor: colors.onError,
		borderColor: colors.onError,
		borderWidth: 1,
	},
	whiteText: {
		...fontStyles.bold,
		color: colors.onPrimary,
	},
	viewText: {
		fontSize: 18,
		...fontStyles.bold,
		color: colors.onPrimary,
	},
	view: {
		borderWidth: 1,
		borderColor: colors.onPrimary,
	},
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
		case 'signingCancel':
			fontStyle = styles.signingCancelText;
			containerStyle = styles.signingCancel;
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
			fontStyle = styles.warningTextEmpty;
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
		case 'view':
			fontStyle = styles.viewText;
			containerStyle = styles.view;
			break;
		default:
			throw new Error('Unknown button type');
	}

	return {
		fontStyle: [styles.text, fontStyle],
		containerStyle: [styles.container, containerStyle],
	};
}

export default getStyles;
