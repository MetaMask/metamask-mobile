import React, { type ReactNode } from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';

import HardwareWalletTestIds from '../hardwareWallet.testIds';
import LedgerDeviceIllustration from './LedgerDeviceIllustration';

interface LookingForDeviceStateProps {
  illustration?: ReactNode;
}

const LookingForDeviceState = ({
  illustration,
}: LookingForDeviceStateProps) => (
  <Box
    testID={HardwareWalletTestIds.LOOKING_FOR_DEVICE}
    twClassName="w-full items-center"
  >
    {illustration ?? <LedgerDeviceIllustration state="searching" />}
    <Text
      variant={TextVariant.HeadingLg}
      fontWeight={FontWeight.Medium}
      twClassName="mt-4 text-center"
    >
      {strings('hardware_wallet.ledger_onboarding.looking_title')}
    </Text>
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      twClassName="mt-2 text-center"
    >
      {strings('hardware_wallet.ledger_onboarding.looking_subtitle')}
    </Text>
  </Box>
);

export default LookingForDeviceState;
