import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

export const VIP_FEE_TILE_TEST_IDS = {
  CONTAINER: 'vip-fee-tile',
  LABEL: 'vip-fee-tile-label',
  CURRENT: 'vip-fee-tile-current',
  NEXT: 'vip-fee-tile-next',
} as const;

interface VipFeeTileProps {
  label: string;
  currentBps: number;
  nextTierBps: number;
  nextTierOverride?: string;
  testID?: string;
}

const VipFeeTile: React.FC<VipFeeTileProps> = ({
  label,
  currentBps,
  nextTierBps,
  nextTierOverride,
  testID,
}) => (
  <Box
    twClassName="flex-1 bg-section rounded-2xl p-4 gap-2"
    testID={testID ?? VIP_FEE_TILE_TEST_IDS.CONTAINER}
  >
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      fontWeight={FontWeight.Medium}
      testID={VIP_FEE_TILE_TEST_IDS.LABEL}
    >
      {label}
    </Text>
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.End}
      twClassName="gap-1"
      testID={VIP_FEE_TILE_TEST_IDS.CURRENT}
    >
      <Text
        variant={TextVariant.DisplayMd}
        fontWeight={FontWeight.Bold}
        color={TextColor.SuccessDefault}
      >
        {currentBps}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="pb-1"
      >
        {strings('rewards.vip.bps_unit')}
      </Text>
    </Box>
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      testID={VIP_FEE_TILE_TEST_IDS.NEXT}
    >
      {nextTierOverride ??
        strings('rewards.vip.next_tier_bps', { bps: nextTierBps })}
    </Text>
  </Box>
);

export default VipFeeTile;
