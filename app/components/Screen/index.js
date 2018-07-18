import React from 'react';
import {
	Dimensions,
	SafeAreaView,
	StatusBar,
	StyleSheet,
	View
} from 'react-native';
import { colors, common } from '../../styles/variables';

export default function({ children }) {
	const { height, width } = Dimensions.get('window');

	return (
		<View style={common.flexGrow}>
			<View style={{...styles.statusBarUnderlay, ...{ width, height }}}>
				<StatusBar
					backgroundColor={colors.tar}
					barStyle="light-content"
				/>
			</View>
			<SafeAreaView style={common.flexGrow}>
				{children}
			</SafeAreaView>
		</View>
	);
}

const styles = StyleSheet.create({
	statusBarUnderlay: {
		backgroundColor: colors.tar,
		left: 0,
		position: 'absolute',
		top: 0
	}
});
