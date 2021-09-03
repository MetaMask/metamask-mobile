import React from 'react';
import { SafeAreaView, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
});

const ScreenView = (props) => (
	<SafeAreaView style={styles.wrapper}>
		<ScrollView {...props} />
	</SafeAreaView>
);

export default ScreenView;
