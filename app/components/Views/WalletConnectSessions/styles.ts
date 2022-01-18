import { StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';

export default StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	scrollviewContent: {
		paddingTop: 20,
	},
	websiteIcon: {
		width: 44,
		height: 44,
	},
	row: {
		flexDirection: 'row',
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderBottomColor: colors.grey000,
		borderBottomWidth: 1,
	},
	info: {
		marginLeft: 20,
		flex: 1,
	},
	name: {
		...fontStyles.bold,
		fontSize: 16,
		marginBottom: 10,
	},
	desc: {
		marginBottom: 10,
		...fontStyles.normal,
		fontSize: 12,
	},
	url: {
		marginBottom: 10,
		...fontStyles.normal,
		fontSize: 12,
		color: colors.fontSecondary,
	},
	emptyWrapper: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyText: {
		...(fontStyles.normal as any),
		fontSize: 16,
	},
});
