import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../../locales/i18n';

import HardwareWalletTestIds from '../hardwareWallet.testIds';
import LedgerDeviceIllustration from './LedgerDeviceIllustration';
import OnboardingTips from './OnboardingTips';

const DeviceNotFoundState = ({
  onRetry,
}: {
  onRetry: () => void;
}) => {
  const tw = useTailwind();

  return (
    <Box
      testID={HardwareWalletTestIds.DEVICE_NOT_FOUND}
      twClassName="w-full items-center"
    >
      <LedgerDeviceIllustration state="not-found" />
      <Text
        variant={TextVariant.HeadingLg}
        fontWeight={FontWeight.Medium}
        twClassName="mt-4 text-center"
      >
        {strings('hardware_wallet.ledger_onboarding.not_found_title')}
      </Text>
      <OnboardingTips />
      <Button
        testID={HardwareWalletTestIds.RETRY_BUTTON}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={onRetry}
        style={tw.style('mt-8 w-full')}
      >
        {strings('ledger.try_again')}
      </Button>
    </Box>
  );
};

export default DeviceNotFoundState;
