import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  AvatarIconSize,
  Box,
  Icon,
  IconColor,
  IconName,
  ListItem,
  ListItemVariant,
  Text,
  TextVariant,
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
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import { AddWalletTestIds } from './AddWallet.testIds';

interface ActionConfig {
  analyticsEvent?: IMetaMetricsEvent;
  description: string;
  iconName: IconName;
  isDisabled?: boolean;
  onPress?: () => void;
  routeName?: string;
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
  const importOptionsSheetRef = useRef<BottomSheetRef>(null);
  const [showImportOptions, setShowImportOptions] = useState(false);

  const openImportOptions = useCallback(() => {
    setShowImportOptions(true);
  }, []);

  const actionConfigs = useMemo<ActionConfig[]>(
    () => [
      {
        description: strings('multichain_accounts.import_wallet_description'),
        iconName: IconName.Wallet,
        onPress: openImportOptions,
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
        description: strings('multichain_accounts.create_wallet_description'),
        iconName: IconName.Add,
        onPress: () => undefined,
        testID: AddWalletTestIds.CREATE_WALLET_BUTTON,
        title: strings('account_actions.create_new_wallet'),
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
    ],
    [openImportOptions],
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleActionPress = useCallback(
    (config: ActionConfig) => {
      if (config.isDisabled) {
        return;
      }
      if (config.onPress) {
        config.onPress();
        return;
      }
      if (!config.routeName || !config.analyticsEvent) {
        return;
      }
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

  const handleImportOptionPress = useCallback(
    (routeName: string, analyticsEvent?: IMetaMetricsEvent) => {
      importOptionsSheetRef.current?.onCloseBottomSheet(() => {
        navigateWithDetails(navigation, [routeName]);
        if (analyticsEvent) {
          trackEvent(createEventBuilder(analyticsEvent).build());
        }
      });
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
        twClassName="flex-1 pt-3"
        style={{ marginTop: headerInset }}
      >
        <TitleStandard
          twClassName="mb-2 px-4"
          title={strings('multichain_accounts.add_wallet')}
        />

        {actionConfigs.map((config) => (
          <ListItem
            key={config.testID}
            isInteractive={!config.isDisabled}
            variant={ListItemVariant.TwoLines}
            onPress={
              config.isDisabled ? undefined : () => handleActionPress(config)
            }
            testID={config.testID}
            style={config.isDisabled ? tw.style('opacity-50') : undefined}
            accessibilityState={{ disabled: config.isDisabled }}
            avatar={
              <AvatarIcon
                iconName={config.iconName}
                severity={AvatarIconSeverity.Neutral}
                size={AvatarIconSize.Lg}
              />
            }
            title={config.title}
            description={config.description}
            endAccessory={
              config.isDisabled ? undefined : (
                <Icon
                  name={IconName.ArrowRight}
                  color={IconColor.IconAlternative}
                />
              )
            }
          />
        ))}
      </Box>
      {showImportOptions ? (
        <BottomSheet
          ref={importOptionsSheetRef}
          shouldNavigateBack={false}
          onClose={() => setShowImportOptions(false)}
          testID={AddWalletTestIds.IMPORT_OPTIONS_SHEET}
        >
          <BottomSheetHeader>
            <Text variant={TextVariant.HeadingSm}>
              {strings('onboarding.import_wallet_options_title')}
            </Text>
          </BottomSheetHeader>
          {isAddDeviceSyncEnabled ? (
            <ListItem
              isInteractive
              variant={ListItemVariant.OneLine}
              onPress={() =>
                handleImportOptionPress(Routes.ONBOARDING.ADD_DEVICE_TO_WALLET)
              }
              testID={AddWalletTestIds.IMPORT_FROM_EXTENSION_BUTTON}
              avatar={
                <AvatarIcon
                  iconName={IconName.Monitor}
                  severity={AvatarIconSeverity.Neutral}
                  size={AvatarIconSize.Lg}
                />
              }
              title={strings('onboarding.metamask_extension')}
              endAccessory={
                <Icon
                  name={IconName.ArrowRight}
                  color={IconColor.IconAlternative}
                />
              }
            />
          ) : null}
          <ListItem
            isInteractive
            variant={ListItemVariant.OneLine}
            onPress={() =>
              handleImportOptionPress(
                Routes.MULTI_SRP.IMPORT,
                MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_CLICKED,
              )
            }
            testID={AddWalletTestIds.IMPORT_FROM_SRP_BUTTON}
            avatar={
              <AvatarIcon
                iconName={IconName.Key}
                severity={AvatarIconSeverity.Neutral}
                size={AvatarIconSize.Lg}
              />
            }
            title={strings('onboarding.using_secret_recovery_phrase')}
            endAccessory={
              <Icon
                name={IconName.ArrowRight}
                color={IconColor.IconAlternative}
              />
            }
          />
        </BottomSheet>
      ) : null}
    </SafeAreaView>
  );
};

export default AddWallet;
