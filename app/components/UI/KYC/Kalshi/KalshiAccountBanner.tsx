import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { selectIsVendorReady } from '@metamask/kyc-controller';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { RootState } from '../../../../reducers';
// POC: reuses Predict internals until Kalshi onboarding moves to KYC.
// eslint-disable-next-line import-x/no-restricted-paths
import { PredictNextRoutes } from '../../PredictNext/navigation/routes';
// POC: reuses Predict internals until Kalshi onboarding moves to KYC.
// eslint-disable-next-line import-x/no-restricted-paths
import type { PredictNextStackParamList } from '../../PredictNext/navigation/types';
import { KALSHI_KYC_VENDOR } from '../vendors/kalshi';

export const KalshiAccountBannerTestIds = {
  BUTTON: 'kalshi-account-banner-button',
} as const;

const selectIsKalshiReady = (state: RootState): boolean => {
  const kyc = state.engine.backgroundState.KycController;
  return kyc ? selectIsVendorReady(kyc, KALSHI_KYC_VENDOR.id) : false;
};

/**
 * POC: invites the user to set up a Kalshi account through UKYC until
 * `sessions.kalshi` is approved and active.
 */
export const KalshiAccountBanner = () => {
  const ready = useSelector(selectIsKalshiReady);
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  if (ready) {
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
