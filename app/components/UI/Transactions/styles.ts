import { StyleSheet, Dimensions } from 'react-native';
import { fontStyles } from '../../../styles/common';

const createStyles = (colors: any) =>
	StyleSheet.create({
		wrapper: {
			backgroundColor: colors.background.default,
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
			backgroundColor: colors.background.default,
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
			color: colors.text.muted,
			...(fontStyles.normal as any),
		},
		viewMoreBody: {
			marginBottom: 36,
			marginTop: 24,
		},
		viewOnEtherscan: {
			fontSize: 16,
			color: colors.primary.default,
			...(fontStyles.normal as any),
			textAlign: 'center',
		},
	});

export default createStyles;
