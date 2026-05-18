import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
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
  currentBps?: number;
  currentValue?: string | number;
  unit?: string;
  nextTierLabel: string;
  nextTierIconName?: IconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const VipFeeTile: React.FC<VipFeeTileProps> = ({
  label,
  currentBps,
  currentValue,
  unit = strings('rewards.vip.bps_unit'),
  nextTierLabel,
  nextTierIconName,
  style,
  testID,
}) => {
  const displayValue = currentValue ?? currentBps;

  return (
    <Box
      twClassName="bg-section rounded-2xl p-4 gap-2"
      style={style}
      testID={testID ?? VIP_FEE_TILE_TEST_IDS.CONTAINER}
    >
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextDefault}
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
          color={TextColor.WarningDefault}
        >
          {displayValue}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.WarningDefault}
          twClassName="pb-1"
        >
          {unit}
        </Text>
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-1"
      >
        {nextTierIconName ? (
          <Icon
            name={nextTierIconName}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        ) : null}
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={VIP_FEE_TILE_TEST_IDS.NEXT}
        >
          {nextTierLabel}
        </Text>
      </Box>
    </Box>
  );
};

export default VipFeeTile;
