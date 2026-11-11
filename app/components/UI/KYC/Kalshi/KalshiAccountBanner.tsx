import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import type { RootState } from '../../../../reducers';
// Reuses Predict's navigation until Kalshi onboarding moves out of Predict.
// eslint-disable-next-line import-x/no-restricted-paths
import { PredictNextRoutes } from '../../PredictNext/navigation/routes';
// eslint-disable-next-line import-x/no-restricted-paths
import type { PredictNextStackParamList } from '../../PredictNext/navigation/types';
import { KALSHI_KYC_VENDOR } from '../vendors/kalshi';

export const KalshiAccountBannerTestIds = {
  BUTTON: 'kalshi-account-banner-button',
} as const;

const selectIsKalshiVerified = (state: RootState): boolean =>
  state.engine.backgroundState.KycFlowController?.vendors?.[
    KALSHI_KYC_VENDOR.id
  ]?.step === 'approved';

/**
 * Invites the user to set up a Kalshi account until kyc-api says their
 * identity is approved. Asks kyc-api once when it shows, so a user who
 * finished on another device or before a reinstall does not see it.
 */
export const KalshiAccountBanner = () => {
  const verified = useSelector(selectIsKalshiVerified);
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();

  useEffect(() => {
    Engine.context.KycFlowController.refreshStep({
      vendor: KALSHI_KYC_VENDOR.id,
    }).catch((error: unknown) => {
      Logger.error(error as Error, {
        tags: { feature: KALSHI_KYC_VENDOR.loggerFeature },
      });
    });
  }, []);

  if (verified) {
    return null;
  }
  return (
    <Box twClassName="absolute bottom-6 left-4 right-4 rounded-2xl bg-section p-4 gap-2">
      <Text variant={TextVariant.BodyMd}>Set up your Kalshi account</Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        Verify once with MetaMask to trade on Kalshi.
      </Text>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Md}
        onPress={() => navigation.navigate(PredictNextRoutes.KALSHI_ONBOARDING)}
        testID={KalshiAccountBannerTestIds.BUTTON}
      >
        Continue
      </Button>
    </Box>
  );
};
