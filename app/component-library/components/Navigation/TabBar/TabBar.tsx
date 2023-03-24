/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// External dependencies.
import TabBarItem from '../TabBarItem';
import { useStyles } from '../../../hooks';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import Routes from '../../../../constants/navigation/Routes';
import { useTheme } from '../../../../util/theme';

// Internal dependencies.
import { TabBarProps } from './TabBar.types';
import styleSheet from './TabBar.styles';
import { ICON_BY_TAB_BAR_ICON_KEY } from './TabBar.constants';
import { colors as importedColors } from '../../../../styles/common';
import { AvatarSize } from '../../Avatars/Avatar';

const TabBar = ({ state, descriptors, navigation }: TabBarProps) => {
  const { colors } = useTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, { bottomInset });

  const renderTabBarItem = useCallback(
    (route: { name: string; key: string }, index: number) => {
      const { options } = descriptors[route.key];
      const tabBarIconKey = options.tabBarIconKey;
      const label = options.tabBarLabel as string;
      //TODO: use another option on add it to the prop interface
      const callback = options.callback;
      const rootScreenName = options.rootScreenName;
      const key = `tab-bar-item-${tabBarIconKey}`;
      const isSelected = state.index === index;
      const icon = ICON_BY_TAB_BAR_ICON_KEY[tabBarIconKey];
      const onPress = () => {
        callback?.();
        switch (rootScreenName) {
          case Routes.WALLET_VIEW:
            navigation.navigate(Routes.WALLET.HOME, {
              screen: Routes.WALLET.TAB_STACK_FLOW,
              params: {
                screen: Routes.WALLET_VIEW,
              },
            });
            break;
          case Routes.MODAL.WALLET_ACTIONS:
            navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
              screen: Routes.MODAL.WALLET_ACTIONS,
            });
            break;
          case Routes.BROWSER_VIEW:
            navigation.navigate(Routes.BROWSER.HOME, {
              screen: Routes.BROWSER_VIEW,
            });
        }
      };

      const isWalletAction = rootScreenName === Routes.MODAL.WALLET_ACTIONS;
      const iconProps = {
        size: isWalletAction ? AvatarSize.Md : AvatarSize.Lg,
        backgroundColor: isWalletAction
          ? colors.primary.default
          : importedColors.transparent,
        color: isWalletAction
          ? colors.primary.inverse
          : isSelected
          ? colors.primary.default
          : colors.icon.muted,
      };

      return (
        <TabBarItem
          key={key}
          label={label}
          icon={icon}
          onPress={onPress}
          iconSize={iconProps.size}
          iconBackgroundColor={iconProps.backgroundColor}
          iconColor={iconProps.color}
          {...generateTestId(Platform, key)}
        />
      );
    },
    [state, descriptors, navigation, colors],
  );

  const renderTabBarItems = useCallback(
    () => state.routes.map(renderTabBarItem),
    [state, renderTabBarItem],
  );

  return (
    <>
      <View style={styles.border} />
      <View style={styles.base}>{renderTabBarItems()}</View>
    </>
  );
};

export default TabBar;
