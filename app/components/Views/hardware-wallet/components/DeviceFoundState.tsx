import React, { type ReactNode } from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';

import HardwareWalletTestIds from '../hardwareWallet.testIds';
import DeviceSelector from './DeviceSelector';
import LedgerDeviceIllustration from './LedgerDeviceIllustration';

const DeviceFoundState = ({
  deviceName,
  disabled,
  onOpenSelector,
  illustration,
}: {
  deviceName: string;
  disabled: boolean;
  onOpenSelector: () => void;
  illustration?: ReactNode;
}) => (
  <Box
    testID={HardwareWalletTestIds.DEVICE_FOUND}
    twClassName="w-full items-center"
  >
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
);

export default DeviceFoundState;
