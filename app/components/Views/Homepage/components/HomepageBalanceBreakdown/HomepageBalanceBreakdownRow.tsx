import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconSize,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { useFormatters } from '../../../../hooks/useFormatters';
import type { SliceData } from '../../BalanceBreakdown/types';
import type { HomepageBalanceBreakdownLayout } from '../../abTestConfig';
import { HomepageBalanceBreakdownTestIds } from './HomepageBalanceBreakdown.testIds';
import {
  getSliceLabel,
  SLICE_ICONS,
  SLICE_ICON_SYMBOLS,
} from './homepageBalanceBreakdown.constants';

const getAllocationColorStyle = (slice: SliceData): ViewStyle => ({
  backgroundColor: slice.color,
});

export interface HomepageBalanceBreakdownRowProps {
  slice: SliceData;
  userCurrency: string;
  onPress: () => void;
  layout: HomepageBalanceBreakdownLayout;
}

const HomepageBalanceBreakdownRow = ({
  slice,
  userCurrency,
  onPress,
  layout,
}: HomepageBalanceBreakdownRowProps) => {
  const tw = useTailwind();
  const privacyMode = useSelector(selectPrivacyMode);
  const { formatCurrency } = useFormatters();
  const isLoading = slice.status === 'loading';
  const roundedPercentage = Math.round(slice.percentOfTotal * 100);
  const percentageLabel =
    slice.status !== 'ready'
      ? null
      : slice.valueFiat !== 0 &&
          slice.percentOfTotal > 0 &&
          roundedPercentage === 0
        ? '<1%'
        : `${roundedPercentage}%`;
  const displayValue =
    slice.status === 'error' || slice.status === 'ineligible'
      ? '—'
      : formatCurrency(slice.valueFiat, userCurrency);
  const valueColor =
    slice.status === 'ready' && slice.valueFiat === 0
      ? TextColor.TextAlternative
      : TextColor.TextDefault;
  const moneyApy = slice.apyPercent;
  const apyLabel =
    moneyApy !== undefined
      ? strings('money.apy_label', { percentage: moneyApy })
      : undefined;
  const accessibilityLabel = privacyMode
    ? getSliceLabel(slice.key)
    : [
        getSliceLabel(slice.key),
        slice.status === 'ready' ? displayValue : undefined,
        percentageLabel,
        apyLabel,
      ]
        .filter(Boolean)
        .join(', ');
  const showIcon = layout === 'icons';
  const showAllocationDot = layout === 'allocation';
  const iconName = SLICE_ICONS[slice.key];
  const iconSymbol = SLICE_ICON_SYMBOLS[slice.key];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      testID={HomepageBalanceBreakdownTestIds.ROW(slice.key)}
      style={({ pressed }) =>
        tw.style('flex-row items-center', 'min-h-10', pressed && 'opacity-80')
      }
    >
      {showIcon ? (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="h-8 w-8 rounded-full bg-muted"
        >
          {iconName ? (
            <Icon
              color={IconColor.IconDefault}
              name={iconName}
              size={IconSize.Md}
              testID={HomepageBalanceBreakdownTestIds.ICON(slice.key)}
            />
          ) : (
            <Text
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Medium}
              testID={HomepageBalanceBreakdownTestIds.ICON(slice.key)}
              variant={TextVariant.HeadingSm}
            >
              {iconSymbol}
            </Text>
          )}
        </Box>
      ) : null}
      <Box twClassName={showIcon ? 'ml-3 min-w-0 flex-1' : 'min-w-0 flex-1'}>
        <Box
          alignItems={BoxAlignItems.Center}
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          gap={3}
        >
          <Box
            alignItems={BoxAlignItems.Center}
            flexDirection={BoxFlexDirection.Row}
            twClassName="min-w-0 flex-1"
            gap={2}
          >
            <Box
              alignItems={BoxAlignItems.Center}
              flexDirection={BoxFlexDirection.Row}
              twClassName="min-w-0 shrink"
              gap={1}
            >
              {showAllocationDot ? (
                <View
                  testID={HomepageBalanceBreakdownTestIds.DOT(slice.key)}
                  style={[
                    tw.style('h-2 w-2 rounded-full mr-1'),
                    getAllocationColorStyle(slice),
                  ]}
                />
              ) : null}
              <Text
                color={TextColor.TextDefault}
                fontWeight={FontWeight.Medium}
                numberOfLines={1}
                twClassName="shrink"
                variant={TextVariant.BodyMd}
              >
                {getSliceLabel(slice.key)}
              </Text>
              {percentageLabel ? (
                <>
                  <Text
                    color={TextColor.TextAlternative}
                    variant={TextVariant.BodyMd}
                  >
                    •
                  </Text>
                  <SensitiveText
                    color={TextColor.TextAlternative}
                    isHidden={privacyMode}
                    length={SensitiveTextLength.Short}
                    testID={HomepageBalanceBreakdownTestIds.PERCENTAGE(
                      slice.key,
                    )}
                    variant={TextVariant.BodyMd}
                  >
                    {percentageLabel}
                  </SensitiveText>
                </>
              ) : null}
            </Box>
            {slice.key === 'money' && slice.apyLoading ? (
              <Skeleton
                height={20}
                testID={HomepageBalanceBreakdownTestIds.APY_SKELETON}
                twClassName="shrink-0"
                width={60}
              />
            ) : moneyApy !== undefined ? (
              <Box
                testID={HomepageBalanceBreakdownTestIds.APY}
                twClassName="shrink-0 rounded-md bg-success-muted px-1.5 py-0.5"
              >
                <Text
                  color={TextColor.SuccessDefault}
                  fontWeight={FontWeight.Medium}
                  variant={TextVariant.BodySm}
                >
                  {apyLabel}
                </Text>
              </Box>
            ) : null}
          </Box>
          <Skeleton
            hideChildren={isLoading}
            testID={HomepageBalanceBreakdownTestIds.SKELETON(slice.key)}
          >
            <SensitiveText
              color={valueColor}
              isHidden={privacyMode}
              length={SensitiveTextLength.Medium}
              testID={HomepageBalanceBreakdownTestIds.VALUE(slice.key)}
              variant={TextVariant.BodyMd}
            >
              {displayValue}
            </SensitiveText>
          </Skeleton>
        </Box>
      </Box>
    </Pressable>
  );
};

export default HomepageBalanceBreakdownRow;
