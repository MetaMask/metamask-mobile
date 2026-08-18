import React from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
  TitleHub,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { addCurrencySymbol } from '../../../../util/number/bigint';
import { formatPriceWithSubscriptNotation } from '../../Predict/utils/format';
import { TokenOverviewSelectorsIDs } from '../TokenOverview.testIds';

export type TokenPriceChangeFormat = 'absoluteSubscript' | 'signedCurrency';

export interface TokenPriceTitleHubProps {
  price: number;
  displayDiff: number | null;
  comparePrice: number | null;
  periodLabel: string | undefined;
  currentCurrency: string;
  isLoading: boolean;
  isChangeLoading?: boolean;
  ambientColor?: string;
  getPriceDiffStyle?: () => StyleProp<TextStyle> | undefined;
  changeFormat?: TokenPriceChangeFormat;
}

type CurrencyCode = Parameters<typeof addCurrencySymbol>[1];

const buildChangeText = (
  displayDiff: number,
  comparePrice: number,
  currentCurrency: string,
  changeFormat: TokenPriceChangeFormat,
): string => {
  const currencyCode = currentCurrency as CurrencyCode;

  if (changeFormat === 'signedCurrency') {
    const percent =
      displayDiff === 0 || comparePrice === 0
        ? '0'
        : ((displayDiff / comparePrice) * 100).toFixed(2);
    return `${displayDiff > 0 ? '+' : ''}${addCurrencySymbol(displayDiff, currencyCode, true)} (${displayDiff > 0 ? '+' : ''}${percent}%)`;
  }

  const diffSign = displayDiff > 0 ? '+' : displayDiff < 0 ? '-' : '';
  const absoluteChange =
    displayDiff !== 0
      ? formatPriceWithSubscriptNotation(Math.abs(displayDiff), currentCurrency)
      : addCurrencySymbol(0, currencyCode, true);
  const percent =
    displayDiff === 0 || comparePrice === 0
      ? '0'
      : ((displayDiff / comparePrice) * 100).toFixed(2);
  return `${diffSign}${absoluteChange} (${displayDiff > 0 ? '+' : ''}${percent}%)`;
};

const getChangeTextColor = (
  displayDiff: number,
  ambientColor?: string,
): TextColor | undefined => {
  if (ambientColor) {
    return undefined;
  }
  if (displayDiff > 0) {
    return TextColor.SuccessDefault;
  }
  if (displayDiff < 0) {
    return TextColor.ErrorDefault;
  }
  return TextColor.TextAlternative;
};

export const TokenPriceTitleHub = ({
  price,
  displayDiff,
  comparePrice,
  periodLabel,
  currentCurrency,
  isLoading,
  isChangeLoading,
  ambientColor,
  getPriceDiffStyle,
  changeFormat = 'absoluteSubscript',
}: TokenPriceTitleHubProps) => {
  const tw = useTailwind();
  const changeLoading = isChangeLoading ?? isLoading;
  const hasChangeData = displayDiff !== null && comparePrice !== null;

  const changeText =
    hasChangeData && displayDiff !== null && comparePrice !== null
      ? buildChangeText(
          displayDiff,
          comparePrice,
          currentCurrency,
          changeFormat,
        )
      : '';

  const changeTextColor =
    hasChangeData && displayDiff !== null
      ? getChangeTextColor(displayDiff, ambientColor)
      : TextColor.TextAlternative;

  const changeTextStyle =
    getPriceDiffStyle?.() ??
    (ambientColor ? { color: ambientColor } : undefined);

  if (isNaN(price)) {
    return null;
  }

  return (
    <TitleHub
      twClassName="px-4 pb-3 pt-4"
      title={undefined}
      amount={
        isLoading ? (
          <Box twClassName="pt-2">
            <Skeleton style={tw.style('h-10 w-[100px] rounded-md')} />
          </Box>
        ) : (
          <Text
            testID={TokenOverviewSelectorsIDs.TOKEN_PRICE}
            variant={TextVariant.DisplayLg}
            color={TextColor.TextDefault}
          >
            {formatPriceWithSubscriptNotation(price, currentCurrency)}
          </Text>
        )
      }
      bottomLabel={
        changeLoading ? (
          <Box testID="loading-price-diff">
            <Skeleton style={tw.style('h-[22px] w-[150px] rounded-md')} />
          </Box>
        ) : hasChangeData ? (
          <Box flexDirection={BoxFlexDirection.Row}>
            <Text
              testID={TokenOverviewSelectorsIDs.TODAYS_CHANGE}
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={changeTextColor}
              style={changeTextStyle}
              allowFontScaling={false}
            >
              {changeText}
            </Text>
            {periodLabel ? (
              <Text
                testID="price-label"
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                allowFontScaling={false}
              >
                {' '}
                {periodLabel}
              </Text>
            ) : null}
          </Box>
        ) : undefined
      }
    />
  );
};
