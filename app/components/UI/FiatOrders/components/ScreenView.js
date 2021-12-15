import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
});

const ScreenView = (props) => (
	<SafeAreaView style={styles.wrapper} edges={['bottom']}>
		<ScrollView {...props} />
	</SafeAreaView>
);

export default ScreenView;
