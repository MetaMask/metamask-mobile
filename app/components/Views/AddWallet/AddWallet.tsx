import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation, StackActions } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  AvatarIcon,
  AvatarIconSeverity,
  Box,
  IconName,
  ListItem,
  ListItemVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { navigateWithDetails } from '../../../util/navigation/navUtils';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { IMetaMetricsEvent } from '../../../core/Analytics/MetaMetrics.types';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { selectAddDeviceSyncEnabled } from '../../../selectors/featureFlagController/addDeviceSync';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import { useHeaderGlassInset } from '../../../component-library/components-temp/HeaderGlass';
import { AddWalletTestIds } from './AddWallet.testIds';

interface ActionConfig {
  analyticsEvent: IMetaMetricsEvent;
  description: string;
  iconName: IconName;
  routeName: string;
  testID: string;
  title: string;
}

const AddWallet = () => {
  const tw = useTailwind();
  const { top: safeAreaTop } = useSafeAreaInsets();
  const { inset: headerInset, onLayout: onHeaderLayout } = useHeaderGlassInset(
    true,
    safeAreaTop,
  );
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isAddDeviceSyncEnabled = useSelector(selectAddDeviceSyncEnabled);

  const actionConfigs = useMemo<ActionConfig[]>(
    () => [
      {
        analyticsEvent: MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_CLICKED,
        description: strings('multichain_accounts.add_wallet_srp_description'),
        iconName: IconName.Wallet,
        routeName: Routes.MULTI_SRP.IMPORT,
        testID: AddWalletTestIds.IMPORT_WALLET_BUTTON,
        title: strings('account_actions.import_wallet'),
      },
      {
        analyticsEvent: MetaMetricsEvents.ACCOUNTS_IMPORTED_NEW_ACCOUNT,
        description: strings(
          'multichain_accounts.add_wallet_private_key_description',
        ),
        iconName: IconName.Download,
        routeName: Routes.IMPORT_PRIVATE_KEY_VIEW,
        testID: AddWalletTestIds.IMPORT_ACCOUNT_BUTTON,
        title: strings('accounts.import_account'),
      },
      {
        analyticsEvent: MetaMetricsEvents.ADD_HARDWARE_WALLET,
        description: strings(
          'multichain_accounts.add_wallet_hardware_description',
        ),
        iconName: IconName.Hardware,
        routeName: Routes.HW.CONNECT,
        testID: AddWalletTestIds.CONNECT_HARDWARE_BUTTON,
        title: strings('connect_hardware.title_select_hardware'),
      },
      ...(isAddDeviceSyncEnabled
        ? [
            {
              // TODO: This is a temporary event for the add device to wallet. Event will be updated after the add device to wallet is implemented.
              analyticsEvent: MetaMetricsEvents.ADD_HARDWARE_WALLET,
              description: strings(
                'multichain_accounts.link_metamask_extension_description',
              ),
              iconName: IconName.Monitor,
              routeName: Routes.ONBOARDING.ADD_DEVICE_TO_WALLET,
              testID: AddWalletTestIds.LINK_METAMASK_EXTENSION_BUTTON,
              title: strings('multichain_accounts.link_metamask_extension'),
            },
          ]
        : []),
    ],
    [isAddDeviceSyncEnabled],
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleActionPress = useCallback(
    (config: ActionConfig) => {
      if (config.routeName === Routes.HW.CONNECT) {
        // Replace AddWallet with the hardware wallet flow so completion
        // (pop(2) in the HW screens) lands on AccountSelector instead of
        // back on this screen. AddWallet and the HW flow now live in the same
        // navigator, so navigate()+goBack() would dismiss the HW flow rather
        // than this screen.
        navigation.dispatch(StackActions.replace(config.routeName));
      } else {
        navigateWithDetails(navigation, [config.routeName]);
      }
      trackEvent(createEventBuilder(config.analyticsEvent).build());
    },
    [createEventBuilder, navigation, trackEvent],
  );

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandardGlass
        backdrop="static"
        onLayout={onHeaderLayout}
        includesTopInset
        onBack={handleBack}
        backButtonProps={{
          accessibilityLabel: strings('navigation.back'),
          testID: AddWalletTestIds.BACK_BUTTON,
        }}
      />
      <Box
        testID={AddWalletTestIds.SCREEN}
        twClassName="flex-1"
        style={{ marginTop: headerInset }}
      >
        <TitleStandard
          twClassName="mb-6 px-4"
          title={strings('multichain_accounts.add_wallet')}
        />

        {actionConfigs.map((config) => (
          <ListItem
            key={config.testID}
            isInteractive
            variant={ListItemVariant.MultiLine}
            onPress={() => handleActionPress(config)}
            testID={config.testID}
            avatar={
              <AvatarIcon
                iconName={config.iconName}
                severity={AvatarIconSeverity.Neutral}
              />
            }
            title={config.title}
            description={config.description}
          />
        ))}
      </Box>
    </SafeAreaView>
  );
};

export default AddWallet;
