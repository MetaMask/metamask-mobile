import { StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';

export default StyleSheet.create({
	screen: { justifyContent: 'center', paddingHorizontal: 24 },
	modal: {
		backgroundColor: colors.white,
		alignItems: 'center',
		borderRadius: 8,
		paddingVertical: 36,
	},
	contentContainer: {
		alignItems: 'center',
	},
	optionsContainer: { flexDirection: 'row', marginTop: 14 },
	option: { alignItems: 'center', paddingHorizontal: 14 },
	optionIcon: { fontSize: 24 },
	optionLabel: { fontSize: 14, fontFamily: 'EuclidCircularB-Regular', color: colors.blue },
	helpOption: { marginVertical: 12 },
	optionLabelRed: { color: colors.fontError },
	fox: { height: 44, width: 44, marginBottom: 12 },
	questionLabel: {
		fontSize: 18,
		paddingHorizontal: 30,
		fontFamily: 'EuclidCircularB-Bold',
		textAlign: 'center',
		color: colors.black,
		lineHeight: 26,
	},
	description: {
		fontSize: 14,
		fontFamily: 'EuclidCircularB-Regular',
		color: colors.greyAssetVisibility,
		textAlign: 'center',
		lineHeight: 20,
		paddingHorizontal: 30,
		marginBottom: 12,
		marginTop: 6,
	},
	contactLabel: {
		color: colors.blue,
	},
	closeButton: { position: 'absolute', right: 16, top: 16 },
});
