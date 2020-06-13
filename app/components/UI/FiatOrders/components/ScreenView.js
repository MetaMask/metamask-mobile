import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { colors } from '../../../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	}
});

const ScreenView = props => (
	<SafeAreaView style={styles.wrapper}>
		<KeyboardAwareScrollView {...props} />
	</SafeAreaView>
);

export default ScreenView;
