import { StyleSheet } from 'react-native';
import { fontStyles, colors } from '../../../styles/common';

export default StyleSheet.create({
	container: {
		flex: 1
	},
	welcome: {
		fontSize: 20
	},
	content: {
		...fontStyles.normal,
		color: colors.white,
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 20
	},
	contentContainer: {
		marginTop: 20
	}
});
