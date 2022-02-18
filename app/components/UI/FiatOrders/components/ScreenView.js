import React from 'react';
import { SafeAreaView, StyleSheet, ScrollView } from 'react-native';
import { useAppThemeFromContext, mockColors } from '../../../../util/theme';

const createStyles = (colors) =>
	StyleSheet.create({
		wrapper: {
			backgroundColor: colors.background.default,
			flex: 1,
		},
	});

const ScreenView = (props) => {
	const { colors } = useAppThemeFromContext() || mockColors;
	const styles = createStyles(colors);

	return (
		<SafeAreaView style={styles.wrapper}>
			<ScrollView {...props} />
		</SafeAreaView>
	);
};

export default ScreenView;
