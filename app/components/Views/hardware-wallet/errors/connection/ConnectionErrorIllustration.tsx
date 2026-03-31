import React from 'react';
import { Box } from '@metamask/design-system-react-native';

import LedgerFailed from '../../../../../images/ledger-failed.svg';
import LedgerInactive from '../../../../../images/ledger-inactive.svg';

export type ConnectionErrorIllustrationVariant =
  | 'bluetoothAccessDenied'
  | 'locationAccessDenied'
  | 'nearbyDevicesDenied'
  | 'bluetoothDisabled'
  | 'bluetoothConnectionFailed';

interface ConnectionErrorIllustrationConfig {
  Svg: React.FC<{ width: number; height: number }>;
  width: number;
  height: number;
}

const illustrationRegistry: Record<
  ConnectionErrorIllustrationVariant,
  ConnectionErrorIllustrationConfig
> = {
  bluetoothAccessDenied: { Svg: LedgerFailed, width: 280, height: 260 },
  locationAccessDenied: { Svg: LedgerFailed, width: 280, height: 260 },
  nearbyDevicesDenied: { Svg: LedgerFailed, width: 280, height: 260 },
  bluetoothDisabled: { Svg: LedgerInactive, width: 280, height: 260 },
  bluetoothConnectionFailed: { Svg: LedgerFailed, width: 280, height: 260 },
};

interface ConnectionErrorIllustrationProps {
  variant: ConnectionErrorIllustrationVariant;
}

const ConnectionErrorIllustration = ({
  variant,
}: ConnectionErrorIllustrationProps) => {
  const { Svg, width, height } = illustrationRegistry[variant];

  return (
    <Box twClassName="h-[300px] w-full items-center justify-center">
      <Svg width={width} height={height} />
    </Box>
  );
};

export default ConnectionErrorIllustration;
