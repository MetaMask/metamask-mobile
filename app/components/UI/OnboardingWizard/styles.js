import { StyleSheet, Dimensions } from 'react-native';
import { fontStyles, colors } from '../../../styles/common';

const SMALL_DEVICE = Dimensions.get('window').height < 600;

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
		marginBottom: SMALL_DEVICE ? 5 : 20
	},
	leftContent: {
		textAlign: 'left'
	},
	titleContainer: {
		marginBottom: SMALL_DEVICE ? -10 : 0
	},
	contentContainer: {
		marginTop: 20
	},
	coachmark: {
		marginHorizontal: SMALL_DEVICE ? 25 : 45
	},
	coachmarkLeft: {
		marginLeft: SMALL_DEVICE ? 5 : 10,
		marginRight: SMALL_DEVICE ? 45 : 85
	}
});
