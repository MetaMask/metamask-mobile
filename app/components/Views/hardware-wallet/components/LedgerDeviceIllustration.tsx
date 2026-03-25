import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';

import { mockTheme, useAppThemeFromContext } from '../../../../util/theme';
import LedgerLogo from '../../../../images/hardware-ledger-logo.svg';

import type { IllustrationState } from './types';

const LedgerDeviceIllustration = ({
  state,
}: {
  state: IllustrationState;
}) => {
  const tw = useTailwind();
  const { colors } = useAppThemeFromContext() ?? mockTheme;
  const indicatorColor =
    state === 'not-found'
      ? colors.background.alternative
      : colors.success.default;

  return (
    <Box twClassName="relative h-[260px] w-[280px] items-center justify-center">
      <Box
        twClassName="absolute left-[104px] top-[46px] h-[72px] w-[120px] rounded-2xl border border-muted bg-muted"
        style={tw.style({
          transform: [{ rotate: '-24deg' }],
        })}
      />
      <Box
        twClassName="absolute left-[72px] top-[112px] h-[88px] w-[176px] rounded-2xl border border-muted bg-muted"
        style={tw.style('shadow-lg')}
      />
      <Box twClassName="absolute left-[40px] top-[104px] h-[104px] w-[104px] items-center justify-center rounded-full border-4 border-muted bg-muted">
        <Box twClassName="h-[52px] w-[52px] rounded-full border border-muted" />
        <Box
          twClassName="absolute h-[36px] w-[36px] rounded-full"
          style={tw.style({ backgroundColor: indicatorColor })}
        />
      </Box>
      <Box twClassName="absolute left-[128px] top-[142px]">
        <LedgerLogo name="ledger-logo" width={72} height={32} />
      </Box>
    </Box>
  );
};

export default LedgerDeviceIllustration;
