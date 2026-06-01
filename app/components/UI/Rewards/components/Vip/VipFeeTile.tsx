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
import { formatNumber } from '../../utils/formatUtils';
import {
  VIP_GOLD_BORDER_DEFAULT,
  VIP_GOLD_TEXT_DEFAULT,
  VIP_GOLD_TEXT_MUTED,
} from './Vip.constants';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';

export const VIP_FEE_TILE_TEST_IDS = {
  CONTAINER: 'vip-fee-tile',
  LABEL: 'vip-fee-tile-label',
  CURRENT: 'vip-fee-tile-current',
  NEXT: 'vip-fee-tile-next',
} as const;

export const VIP_FEE_TILE_WIDTH = 168;

const vipGoldTextMutedStyle = { color: VIP_GOLD_TEXT_MUTED };

interface VipFeeTileProps {
  label: string;
  currentBps?: number;
  unit?: string;
  nextTierLabel?: string;
  testID?: string;
}

const VipFeeTile: React.FC<VipFeeTileProps> = ({
  label,
  currentBps,
  unit = strings('rewards.vip.bps_unit'),
  nextTierLabel,
  testID,
}) => {
  const { themeAppearance } = useTheme();
  const mutedTextStyle =
    themeAppearance === AppThemeKey.dark ? vipGoldTextMutedStyle : undefined;
  const mutedTextColor =
    themeAppearance === AppThemeKey.dark
      ? undefined
      : TextColor.TextAlternative;
  const displayValue =
    unit === '%' && currentBps !== undefined
      ? formatNumber(currentBps / 100, 2)
      : currentBps;

  return (
    <Box
      twClassName="bg-section rounded-2xl p-4"
      style={{
        width: VIP_FEE_TILE_WIDTH,
        borderColor: VIP_GOLD_BORDER_DEFAULT,
      }}
      testID={testID ?? VIP_FEE_TILE_TEST_IDS.CONTAINER}
      borderWidth={1}
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
        testID={VIP_FEE_TILE_TEST_IDS.CURRENT}
        twClassName="gap-1"
      >
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          style={{ color: VIP_GOLD_TEXT_DEFAULT }}
        >
          {displayValue}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          style={{ color: VIP_GOLD_TEXT_DEFAULT }}
          twClassName="pb-1"
        >
          {unit}
        </Text>
      </Box>
      {nextTierLabel ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          <Text
            variant={TextVariant.BodySm}
            color={mutedTextColor}
            testID={VIP_FEE_TILE_TEST_IDS.NEXT}
            style={mutedTextStyle}
          >
            {nextTierLabel}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};

export default VipFeeTile;
