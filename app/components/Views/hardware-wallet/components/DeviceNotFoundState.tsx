import React, { type ReactNode } from 'react';
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
  illustration,
}: {
  onRetry: () => void;
  illustration?: ReactNode;
}) => {
  const tw = useTailwind();

  return (
    <Box
      testID={HardwareWalletTestIds.DEVICE_NOT_FOUND}
      twClassName="w-full flex-1 justify-between"
    >
      <Box twClassName="items-center">
        {illustration ?? <LedgerDeviceIllustration state="not-found" />}
      </Box>
      <Box twClassName="items-center px-4 pb-4">
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Medium}
          twClassName="text-center"
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
    </Box>
  );
};

export default DeviceNotFoundState;
