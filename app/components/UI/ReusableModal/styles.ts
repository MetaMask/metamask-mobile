import { StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	overlayBackground: {
		backgroundColor: colors.overlay,
		...StyleSheet.absoluteFillObject,
	},
	fill: {
		flex: 1,
	},
});
