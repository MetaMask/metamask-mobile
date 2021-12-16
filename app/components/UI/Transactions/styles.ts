import { StyleSheet, Dimensions } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';

export default StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.white,
		minHeight: Dimensions.get('window').height / 2,
	},
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	loader: {
		alignSelf: 'center',
	},
	text: {
		fontSize: 20,
		color: colors.fontTertiary,
		...(fontStyles.normal as any),
	},
	viewMoreBody: {
		marginBottom: 36,
		marginTop: 24,
	},
	viewOnEtherscan: {
		fontSize: 16,
		color: colors.blue,
		...(fontStyles.normal as any),
		textAlign: 'center',
	},
});
