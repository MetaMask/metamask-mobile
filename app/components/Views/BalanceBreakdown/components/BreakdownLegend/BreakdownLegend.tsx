import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { useSelector } from 'react-redux';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { useFormatters } from '../../../../hooks/useFormatters';
import type { SliceData, SliceKey, HeroData } from '../../types';
import { SLICE_ORDER } from '../../constants';
import { BalanceBreakdownTestIds } from '../../BalanceBreakdown.testIds';
import { getPrivacyMaskText } from '../../utils/privacyMask';
import {
  breakdownLegendStyles,
  breakdownLegendColorDotStyle,
  breakdownLegendRowTwClass,
} from './BreakdownLegend.styles';

interface Props {
  slices: Record<SliceKey, SliceData>;
  hero: HeroData;
  selectedSlice: SliceKey | 'all';
  onSlicePress: (key: SliceKey | 'all') => void;
}

const BreakdownLegend: React.FC<Props> = ({
  slices,
  hero,
  selectedSlice,
  onSlicePress,
}) => {
  const tw = useTailwind();
  const { formatCurrency } = useFormatters();
  const privacyMode = useSelector(selectPrivacyMode);

  return (
    <Box>
      {SLICE_ORDER.map((key) => {
        const slice = slices[key];
        const isSelected = selectedSlice === key;
        const isLoading = slice.status === 'loading';
        const isError = slice.status === 'error';
        const isIneligible = slice.status === 'ineligible';

        const pct = isIneligible ? '—' : `${(slice.percentOfTotal * 100).toFixed(0)}%`;
        const displayValue = isIneligible || isError
          ? '—'
          : formatCurrency(slice.valueFiat, hero.userCurrency);

        const dotDimmed = !isSelected && selectedSlice !== 'all';

        return (
          <Pressable
            key={key}
            onPress={isIneligible ? undefined : () => onSlicePress(isSelected ? 'all' : key)}
            disabled={isIneligible}
            testID={BalanceBreakdownTestIds.LEGEND_ROW(key)}
            style={({ pressed }) =>
              tw.style(breakdownLegendRowTwClass(pressed, isIneligible, isSelected))
            }
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={3}
            >
              <Box style={breakdownLegendColorDotStyle(slice.color, dotDimmed)} />
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={isSelected ? FontWeight.Bold : FontWeight.Regular}
              >
                {slice.label}
              </Text>
            </Box>

            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={3}
            >
              <Skeleton
                hideChildren={isLoading}
                style={breakdownLegendStyles.skeletonLegend}
              >
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  testID={BalanceBreakdownTestIds.LEGEND_PERCENT(key)}
                >
                  {pct}
                </Text>
              </Skeleton>

              <Skeleton
                hideChildren={isLoading}
                style={breakdownLegendStyles.skeletonLegend}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  testID={BalanceBreakdownTestIds.LEGEND_VALUE(key)}
                >
                  {privacyMode ? getPrivacyMaskText('medium') : displayValue}
                </Text>
              </Skeleton>
            </Box>
          </Pressable>
        );
      })}
    </Box>
  );
};

export default BreakdownLegend;
