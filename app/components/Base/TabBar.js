import React from 'react';
import { StyleSheet } from 'react-native';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { fontStyles } from '../../styles/common';
import { useTheme } from '../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.primary.default,
    },
    tabStyle: {
      paddingVertical: 8,
    },
    textStyle: {
      ...fontStyles.normal,
      fontSize: 14,
    },
    tabBar: {
      borderColor: colors.border.muted,
    },
  });

function TabBar({ ...props }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <DefaultTabBar
      underlineStyle={styles.tabUnderlineStyle}
      activeTextColor={colors.primary.default}
      inactiveTextColor={colors.text.alternative}
      backgroundColor={colors.background.default}
      tabStyle={styles.tabStyle}
      textStyle={styles.textStyle}
      style={styles.tabBar}
      {...props}
    />
  );
}

export default TabBar;
