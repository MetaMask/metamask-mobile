import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, StackActions } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import EngineService from '../../../core/EngineService';
import { createWalletResetNeededNavDetails } from './WalletResetNeeded';
import { createWalletRestoredNavDetails } from './WalletRestored';
import { MetaMetricsEvents } from '../../../core/Analytics';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { useMetrics } from '../../../components/hooks/useMetrics';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const onboardingDeviceImage = require('../../../images/swaps_onboard_device.png');

interface RestoreWalletParams {
  previousScreen: string;
}

export const createRestoreWalletNavDetails =
  createNavigationDetails<RestoreWalletParams>(
    Routes.VAULT_RECOVERY.RESTORE_WALLET,
  );

export const createRestoreWalletNavDetailsNested =
  createNavigationDetails<RestoreWalletParams>(
    Routes.VAULT_RECOVERY.RESTORE_WALLET,
    Routes.VAULT_RECOVERY.RESTORE_WALLET,
  );

const RestoreWallet = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
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
    } else {
      navigation.dispatch(
        StackActions.replace(...createWalletResetNeededNavDetails()),
      );
    }
    setLoading(false);
  }, [deviceMetaData, navigation, trackEvent, createEventBuilder]);

  return (
    <SafeAreaView style={tw.style('flex-1')}>
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="flex-1 px-6"
      >
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
            fontWeight={FontWeight.Bold}
            twClassName="text-center pb-4"
          >
            {strings('restore_wallet.restore_needed_title')}
          </Text>
          <Text variant={TextVariant.BodyMd} twClassName="text-center p-2">
            {strings('restore_wallet.restore_needed_description')}
          </Text>
        </Box>
        <Box twClassName="w-full">
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={handleOnNext}
            loading={loading}
            label={strings('restore_wallet.restore_needed_action')}
            style={tw.style('my-2.5')}
          />
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default React.memo(RestoreWallet);
