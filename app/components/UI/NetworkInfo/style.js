import { colors } from '../../../styles/common';
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		borderRadius: 10,
	},
	closeIcon: {
		position: 'absolute',
		top: 10,
		right: 10,
		padding: 10,
	},
	modalContentView: {
		padding: 20,
		top: 20,
	},
	title: {
		fontSize: 16,
		fontWeight: 'bold',
		marginVertical: 10,
		textAlign: 'center',
	},
	tokenType: {
		backgroundColor: colors.grey100,
		marginRight: 40,
		marginLeft: 40,
		padding: 10,
		borderRadius: 40,
		alignItems: 'center',
		marginBottom: 30,
	},
	tokenText: {
		fontSize: 15,
		textTransform: 'capitalize',
	},
	messageTitle: {
		fontSize: 14,
		fontWeight: 'bold',
		marginBottom: 15,
		textAlign: 'center',
	},
	descriptionViews: {
		marginBottom: 15,
	},
	descriptionContainer: {
		marginBottom: 10,
	},
	contentContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	numberStyle: {
		marginRight: 10,
	},
	description: {
		width: '94%',
	},
	closeButton: {
		marginVertical: 20,
	},
	link: {
		color: colors.blue,
	},
});

export default styles;
