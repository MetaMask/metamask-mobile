import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { IMetaMetricsEvent } from '../../../core/Analytics/MetaMetrics.types';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
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
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

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
    ],
    [],
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleActionPress = useCallback(
    (config: ActionConfig) => {
      navigation.navigate(config.routeName as never);
      trackEvent(createEventBuilder(config.analyticsEvent).build());
    },
    [createEventBuilder, navigation, trackEvent],
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-default`} edges={['top', 'bottom']}>
      <Box testID={AddWalletTestIds.SCREEN} twClassName="flex-1 bg-default">
        <Box twClassName="px-2 py-4">
          <ButtonIcon
            accessibilityLabel="Back"
            iconName={IconName.ArrowLeft}
            onPress={handleBack}
            testID={AddWalletTestIds.BACK_BUTTON}
          />
        </Box>

        <Box gap={6} paddingHorizontal={4}>
          <Text color={TextColor.TextDefault} variant={TextVariant.HeadingLg}>
            {strings('multichain_accounts.add_wallet')}
          </Text>

          <Box gap={3}>
            {actionConfigs.map((config) => (
              <Pressable
                key={config.testID}
                onPress={() => handleActionPress(config)}
                testID={config.testID}
                accessibilityRole="button"
                style={({ pressed }) =>
                  tw.style(
                    'w-full rounded-xl bg-background-muted px-4 py-3',
                    pressed && 'opacity-80',
                  )
                }
              >
                <Box
                  alignItems={BoxAlignItems.Center}
                  flexDirection={BoxFlexDirection.Row}
                  gap={4}
                >
                  <Box
                    alignItems={BoxAlignItems.Center}
                    justifyContent={BoxJustifyContent.Center}
                    twClassName="h-10 w-10 rounded-xl bg-muted"
                  >
                    <Icon
                      color={IconColor.IconAlternative}
                      name={config.iconName}
                      size={IconSize.Md}
                    />
                  </Box>

                  <Box twClassName="flex-1">
                    <Text
                      color={TextColor.TextDefault}
                      fontWeight={FontWeight.Medium}
                      variant={TextVariant.BodyMd}
                    >
                      {config.title}
                    </Text>
                    <Text
                      color={TextColor.TextAlternative}
                      fontWeight={FontWeight.Medium}
                      variant={TextVariant.BodySm}
                    >
                      {config.description}
                    </Text>
                  </Box>
                </Box>
              </Pressable>
            ))}
          </Box>
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default AddWallet;
