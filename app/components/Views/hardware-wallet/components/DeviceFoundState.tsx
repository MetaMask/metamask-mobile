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
import DeviceSelector from './DeviceSelector';
import LedgerDeviceIllustration from './LedgerDeviceIllustration';

const DeviceFoundState = ({
  deviceName,
  disabled,
  onConnect,
  onOpenSelector,
  illustration,
}: {
  deviceName: string;
  disabled: boolean;
  onConnect: () => void;
  onOpenSelector: () => void;
  illustration?: ReactNode;
}) => {
  const tw = useTailwind();

  return (
    <Box
      testID={HardwareWalletTestIds.DEVICE_FOUND}
      twClassName="w-full flex-1"
    >
      <Box twClassName="flex-1 items-center justify-center">
        {illustration ?? <LedgerDeviceIllustration state="found" />}
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Medium}
          twClassName="mt-4 text-center"
        >
          {strings('hardware_wallet.ledger_onboarding.found_title')}
        </Text>
        <Box twClassName="mt-4">
          <DeviceSelector
            deviceName={deviceName}
            disabled={disabled}
            onPress={onOpenSelector}
          />
        </Box>
      </Box>
      <Box twClassName="px-4 pb-4">
        <Button
          testID={HardwareWalletTestIds.CONNECT_BUTTON}
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onConnect}
          style={tw.style('w-full')}
        >
          {strings('ledger.connect_ledger')}
        </Button>
      </Box>
    </Box>
  );
};

export default DeviceFoundState;
