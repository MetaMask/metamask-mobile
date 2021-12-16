import React from 'react';
import { SafeAreaView, StyleSheet, ScrollView } from 'react-native';
import { useAppThemeFromContext } from '../../../../util/theme';

const ScreenView = (props) => {
	const { colors } = useAppThemeFromContext();
	const styles = StyleSheet.create({
		wrapper: {
			backgroundColor: colors.backgroundDefault,
			flex: 1,
		},
	});
	return (
		<SafeAreaView style={styles.wrapper}>
			<ScrollView {...props} />
		</SafeAreaView>
	);
};

export default ScreenView;
