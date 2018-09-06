import { StyleSheet, Platform } from 'react-native';
import { colors, fontStyles } from '../../styles/common';

const styles = StyleSheet.create({
	container: {
		padding: Platform.OS === 'android' ? 10 : 15,
		borderRadius: 4,
		justifyContent: 'center'
	},
	text: {
		fontSize: 18,
		textAlign: 'center',
		textTransform: 'uppercase',
		...fontStyles.bold
	},
	orange: {
		backgroundColor: colors.primaryFox
	},
	orangeText: {
		color: colors.white
	},
	confirm: {
		backgroundColor: colors.primary
	},
	confirmText: {
		color: colors.white
	},
	normal: {
		backgroundColor: colors.white,
		borderWidth: 2,
		borderColor: colors.primary
	},
	normalText: {
		color: colors.primary
	},
	transparent: {
		backgroundColor: colors.white,
		borderWidth: 0,
		borderColor: colors.white
	},
	cancel: {
		backgroundColor: colors.white,
		borderWidth: 2,
		borderColor: colors.accentGray
	},
	cancelText: {
		color: colors.accentGray
	}
});

function getStyles(type) {
	let fontStyle, containerStyle;
	switch (type) {
		case 'orange':
			fontStyle = styles.orangeText;
			containerStyle = styles.orange;
			break;
		case 'confirm':
			fontStyle = styles.confirmText;
			containerStyle = styles.confirm;
			break;
		case 'normal':
			fontStyle = styles.normalText;
			containerStyle = styles.normal;
			break;
		case 'cancel':
			fontStyle = styles.cancelText;
			containerStyle = styles.cancel;
			break;
		case 'transparent':
			fontStyle = styles.normalText;
			containerStyle = styles.transparent;
			break;
		default:
			throw new Error('Unknown button type');
	}

	return {
		fontStyle: { ...styles.text, ...fontStyle },
		containerStyle: { ...styles.container, ...containerStyle }
	};
}

export default getStyles;
