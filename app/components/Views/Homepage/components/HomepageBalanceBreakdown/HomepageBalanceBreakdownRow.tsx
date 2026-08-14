import React from 'react';
import { View, type ViewStyle } from 'react-native';
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
  ListItem,
  ListItemVariant,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { formatWithThreshold } from '../../../../../util/assets';
import { getIntlNumberFormatter } from '../../../../../util/intl';
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

const allocationDotStyle: ViewStyle = {
  width: 8,
  height: 8,
  borderRadius: 999,
  marginRight: 4,
};

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
  const privacyMode = useSelector(selectPrivacyMode);
  const { formatCurrency } = useFormatters();
  const isLoading = slice.status === 'loading';
  const percentageLabel =
    slice.status !== 'ready'
      ? null
      : formatWithThreshold(slice.percentOfTotal, 0.01, I18n.locale, {
          style: 'percent',
          maximumFractionDigits: 0,
        });
  const formattedValue = formatCurrency(slice.valueFiat, userCurrency);
  const zeroValue = formatCurrency(0, userCurrency);
  const displayValue =
    slice.status === 'error' || slice.status === 'ineligible'
      ? '—'
      : slice.valueFiat > 0 && formattedValue === zeroValue
        ? `<${formattedValue}`
        : formattedValue;
  const valueColor =
    slice.status === 'ready' && slice.valueFiat === 0
      ? TextColor.TextAlternative
      : TextColor.TextDefault;
  const moneyApy = slice.apyPercent;
  const formattedMoneyApy =
    moneyApy !== undefined
      ? getIntlNumberFormatter(I18n.locale, {
          maximumFractionDigits: 1,
        }).format(moneyApy)
      : undefined;
  const apyLabel =
    formattedMoneyApy !== undefined
      ? strings('money.apy_label', { percentage: formattedMoneyApy })
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

  const avatar = showIcon ? (
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
  ) : undefined;

  const title = (
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
            style={[allocationDotStyle, getAllocationColorStyle(slice)]}
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
              testID={HomepageBalanceBreakdownTestIds.PERCENTAGE(slice.key)}
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
  );

  const value = (
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
  );

  return (
    <ListItem
      accessibilityLabel={accessibilityLabel}
      avatar={avatar}
      isInteractive
      onPress={onPress}
      testID={HomepageBalanceBreakdownTestIds.ROW(slice.key)}
      title={title}
      twClassName="min-h-10 py-0"
      value={value}
      variant={ListItemVariant.OneLine}
    />
  );
};

export default HomepageBalanceBreakdownRow;
