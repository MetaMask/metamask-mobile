import React from 'react';

import LedgerFailed from '../../../../images/ledger-failed.svg';
import LedgerLoading from '../../../../images/ledger-loading.svg';
import LedgerSuccess from '../../../../images/ledger-success.svg';

import type { IllustrationState } from './types';

const STATE_SVG_MAP: Record<
  IllustrationState,
  React.FC<import('react-native-svg').SvgProps & { name: string }>
> = {
  searching: LedgerLoading,
  found: LedgerSuccess,
  'not-found': LedgerFailed,
};

const LedgerDeviceIllustration = ({ state }: { state: IllustrationState }) => {
  const Svg = STATE_SVG_MAP[state];
  return <Svg width={280} height={260} />;
};

export default LedgerDeviceIllustration;
