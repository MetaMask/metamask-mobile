/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useRef } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

// External dependencies.
import TabBarItem from '../TabBarItem';
import { useStyles } from '../../../hooks';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import Routes from '../../../../constants/navigation/Routes';
import { useTheme } from '../../../../util/theme';
import Analytics from '../../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { selectChainId } from '../../../../selectors/networkController';

// Internal dependencies.
import { TabBarProps } from './TabBar.types';
import styleSheet from './TabBar.styles';
import { ICON_BY_TAB_BAR_ICON_KEY } from './TabBar.constants';
import { colors as importedColors } from '../../../../styles/common';
import { AvatarSize } from '../../Avatars/Avatar';
import OnboardingWizard from '../../../../components/UI/OnboardingWizard';

const TabBar = ({ state, descriptors, navigation }: TabBarProps) => {
  const { colors } = useTheme();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, { bottomInset });
  const chainId = useSelector(selectChainId);
  const tabBarRef = useRef(null);
  /**
   * Current onboarding wizard step
   */
  const wizardStep = useSelector((reduxState: any) => reduxState.wizard.step);

  /**
   * Return current step of onboarding wizard if not step 5 nor 0
   */
  const renderOnboardingWizard = useCallback(
    () =>
      [4, 5].includes(wizardStep) && (
        <OnboardingWizard navigation={navigation} coachmarkRef={tabBarRef} />
      ),
    [navigation, wizardStep],
  );

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
            Analytics.trackEventWithParameters(
              MetaMetricsEvents.ACTIONS_BUTTON_CLICKED,
              {
                text: '',
                chain_id: chainId,
              },
            );
            break;
          case Routes.BROWSER_VIEW:
            navigation.navigate(Routes.BROWSER.HOME, {
              screen: Routes.BROWSER_VIEW,
            });
            break;
          case Routes.TRANSACTIONS_VIEW:
            navigation.navigate(Routes.TRANSACTIONS_VIEW);
            break;
          case Routes.SETTINGS_VIEW:
            navigation.navigate(Routes.SETTINGS_VIEW, {
              screen: 'Settings',
            });
        }
      };

      const isWalletAction = rootScreenName === Routes.MODAL.WALLET_ACTIONS;

      const handleIconColor = () => {
        if (isWalletAction) return colors.primary.inverse;

        if (isSelected) return colors.primary.default;

        return colors.icon.muted;
      };

      const iconProps = {
        size: isWalletAction ? AvatarSize.Md : AvatarSize.Lg,
        backgroundColor: isWalletAction
          ? colors.primary.default
          : importedColors.transparent,
        color: handleIconColor(),
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
          testID={key}
          {...generateTestId(Platform, key)}
        />
      );
    },
    [state, descriptors, navigation, colors, chainId],
  );

  const renderTabBarItems = useCallback(
    () => state.routes.map(renderTabBarItem),
    [state, renderTabBarItem],
  );

  return (
    <>
      <View style={styles.border} />
      <View style={styles.base} ref={tabBarRef}>
        {renderTabBarItems()}
        {renderOnboardingWizard()}
      </View>
    </>
  );
};

export default TabBar;
