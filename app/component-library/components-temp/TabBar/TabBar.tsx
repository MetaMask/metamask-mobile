// Third party dependencies.
import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import DefaultTabBar from '@tommasini/react-native-scrollable-tab-view/DefaultTabBar';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies.
import stylesheet from './TabBar.styles';
import { TabBarProps } from './TabBar.types';

const TabBar = (props: TabBarProps) => {
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;

  return (
    <DefaultTabBar
      underlineStyle={styles.tabUnderlineStyle}
      activeTextColor={colors.text.default}
      inactiveTextColor={colors.text.alternative}
      backgroundColor={colors.background.default}
      tabStyle={styles.tabStyle}
      textStyle={styles.textStyle}
      {...props}
      style={[styles.tabBar, props.style]}
    />
  );
};

export default TabBar;
