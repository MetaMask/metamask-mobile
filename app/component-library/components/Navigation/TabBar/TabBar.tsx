/* eslint-disable react/prop-types */
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles } from '../../hooks';
import { IconName } from '../Icon';
import TabBarItem from '../TabBarItem';
import styleSheet from './TabBar.styles';
import { TabBarLabel, TabBarProps, IconByTabBarLabel } from './TabBar.types';

const iconByTabBarLabel: IconByTabBarLabel = {
  [TabBarLabel.Wallet]: IconName.WalletFilled,
  [TabBarLabel.Browser]: IconName.ExploreFilled,
};

const TabBar = ({ state, descriptors, navigation }: TabBarProps) => {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, { bottomInset });

  const renderTabBarItem = useCallback(
    (route: { name: string; key: string }, index: number) => {
      const label = descriptors[route.key].options.tabBarLabel as TabBarLabel;
      const key = `tab-bar-item-${label}`;
      const isSelected = state.index === index;
      const icon = iconByTabBarLabel[label];
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
