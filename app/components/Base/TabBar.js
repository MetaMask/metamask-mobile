import React from 'react';
import { StyleSheet } from 'react-native';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';

import { colors, fontStyles } from '../../styles/common';

const styles = StyleSheet.create({
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.blue,
	},
	tabStyle: {
		paddingVertical: 8,
	},
	textStyle: {
		...fontStyles.normal,
		fontSize: 14,
	},
});

function TabBar({ ...props }) {
	return (
		<DefaultTabBar
			underlineStyle={styles.tabUnderlineStyle}
			activeTextColor={colors.blue}
			inactiveTextColor={colors.fontSecondary}
			backgroundColor={colors.white}
			tabStyle={styles.tabStyle}
			textStyle={styles.textStyle}
			{...props}
		/>
	);
}

export default TabBar;
