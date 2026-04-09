/* eslint-disable import-x/no-commonjs */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  Button,
  BoxAlignItems,
  BoxJustifyContent,
  TextVariant,
  TextColor,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import EngineService from '../../../core/EngineService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, StackActions } from '@react-navigation/native';
import { createWalletResetNeededNavDetails } from './WalletResetNeeded';
import { createWalletRestoredNavDetails } from './WalletRestored';
import { MetaMetricsEvents } from '../../../core/Analytics';

import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';

/* eslint-disable import-x/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const onboardingDeviceImage = require('../../../images/swaps_onboard_device.png');
interface RestoreWalletParams {
  previousScreen: string;
}

export const createRestoreWalletNavDetails =
  createNavigationDetails<RestoreWalletParams>(
    Routes.VAULT_RECOVERY.RESTORE_WALLET,
  );

// Needed for passing the proper params from outside this stack navigator
// This occurs from the Login screen
export const createRestoreWalletNavDetailsNested =
  createNavigationDetails<RestoreWalletParams>(
    Routes.VAULT_RECOVERY.RESTORE_WALLET,
    Routes.VAULT_RECOVERY.RESTORE_WALLET,
  );

const RestoreWallet = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const tw = useTailwind();

  const [loading, setLoading] = useState<boolean>(false);

  const navigation = useNavigation();

  const deviceMetaData = useMemo(() => generateDeviceAnalyticsMetaData(), []);
  const { previousScreen } = useParams<RestoreWalletParams>();

  useEffect(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.VAULT_CORRUPTION_RESTORE_WALLET_SCREEN_VIEWED,
      )
        .addProperties({ ...deviceMetaData, previousScreen })
        .build(),
    );
  }, [deviceMetaData, previousScreen, trackEvent, createEventBuilder]);

  const handleOnNext = useCallback(async (): Promise<void> => {
    setLoading(true);

    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.VAULT_CORRUPTION_RESTORE_WALLET_BUTTON_PRESSED,
      )
        .addProperties({ ...deviceMetaData })
        .build(),
    );
    const restoreResult = await EngineService.initializeVaultFromBackup();
    if (restoreResult.success) {
      navigation.dispatch(
        StackActions.replace(...createWalletRestoredNavDetails()),
      );
      setLoading(false);
    } else {
      navigation.dispatch(
        StackActions.replace(...createWalletResetNeededNavDetails()),
      );
      setLoading(false);
    }
  }, [deviceMetaData, navigation, trackEvent, createEventBuilder]);

  return (
    <SafeAreaView style={tw.style('flex-1 px-6 justify-between items-center')}>
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1"
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="p-4">
          <Image source={onboardingDeviceImage} />
        </Box>
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          twClassName="text-center pb-4"
        >
          {strings('restore_wallet.restore_needed_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          twClassName="text-center p-2"
        >
          {strings('restore_wallet.restore_needed_description')}
        </Text>
      </Box>
      <Box twClassName="w-full my-2.5">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleOnNext}
          isLoading={loading}
          twClassName="bg-primary-default"
        >
          {strings('restore_wallet.restore_needed_action')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default React.memo(RestoreWallet);
