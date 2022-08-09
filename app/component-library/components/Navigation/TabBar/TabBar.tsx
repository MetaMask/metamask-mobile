/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// External dependencies.
import TabBarItem from '../TabBarItem';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { TabBarLabel, TabBarProps } from './TabBar.types';
import styleSheet from './TabBar.styles';
import { ICON_BY_TAB_BAR_LABEL } from './TabBar.constants';

const TabBar = ({ state, descriptors, navigation }: TabBarProps) => {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, { bottomInset });

  const renderTabBarItem = useCallback(
    (route: { name: string; key: string }, index: number) => {
      const label = descriptors[route.key].options.tabBarLabel as TabBarLabel;
      const key = `tab-bar-item-${label}`;
      const isSelected = state.index === index;
      const icon = ICON_BY_TAB_BAR_LABEL[label];
      const onPress = () => !isSelected && navigation.navigate(route.name);

      return (
        <TabBarItem
          key={key}
          isSelected={isSelected}
          label={label}
          icon={icon}
          onPress={onPress}
        />
      );
    },
    [state, descriptors, navigation],
  );

  const renderTabBarItems = useCallback(
    () => state.routes.map(renderTabBarItem),
    [state, renderTabBarItem],
  );

  return <View style={styles.base}>{renderTabBarItems()}</View>;
};

export default TabBar;
