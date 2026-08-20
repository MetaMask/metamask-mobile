import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Slider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';
import { formatTokenBalance } from '../../utils';
import { BridgeToken } from '../../types';
import { BatchSellReviewSelectorsIDs } from './BatchSellReview.testIds';
import { getBatchSellSourceTokenAmount } from '../../hooks/useBatchSellQuoteRequest';

interface BatchSellReviewTokenRowProps {
  token: BridgeToken;
  tokenKey: string;
  percent: number;
  receivedAmount: string;
  isLoading?: boolean;
  isQuoteUnavailable?: boolean;
  isHighPriceImpact?: boolean;
  onHighPriceImpactPress?: () => void;
  onPercentChange: (tokenKey: string, percent: number) => void;
  onSlippagePress?: (token: BridgeToken) => void;
  onRemovePress?: (token: BridgeToken) => void;
  isRemoveTokenDisabled?: boolean;
}

function getTokenBalanceText(token: BridgeToken, percent: number) {
  const sourceAmount = getBatchSellSourceTokenAmount(token, percent);
  const balanceText = sourceAmount
    ? `${formatTokenBalance(sourceAmount)} ${token.symbol}`
    : token.symbol;

  return `${balanceText} • ${percent}%`;
}

export function BatchSellReviewTokenRow({
  token,
  tokenKey,
  percent,
  receivedAmount,
  isLoading = false,
  isQuoteUnavailable = false,
  isHighPriceImpact = false,
  onHighPriceImpactPress,
  onPercentChange,
  onSlippagePress,
  onRemovePress,
  isRemoveTokenDisabled = false,
}: BatchSellReviewTokenRowProps) {
  const tw = useTailwind();
  // Live slider percent for immediate subtitle updates while dragging. The parent
  // `percent` prop is only committed on drag end (Redux + debounced quote fetch).
  const [displayPercent, setDisplayPercent] = useState(percent);

  useEffect(() => {
    setDisplayPercent(percent);
  }, [percent]);

  const balanceText = useMemo(
    () => getTokenBalanceText(token, displayPercent),
    [displayPercent, token],
  );
  const shouldShowHighPriceImpactTag =
    !isLoading && !isQuoteUnavailable && isHighPriceImpact;

  const handleSliderValueChange = useCallback((nextPercent: number) => {
    setDisplayPercent(nextPercent);
  }, []);

  const handleSliderDragEnd = useCallback(
    (nextPercent: number) => {
      setDisplayPercent(nextPercent);
      onPercentChange(tokenKey, nextPercent);
    },
    [onPercentChange, tokenKey],
  );

  const handleSliderGrip = useCallback(() => {
    playImpact(ImpactMoment.SliderGrip);
  }, []);

  const handleSliderMark = useCallback(() => {
    playImpact(ImpactMoment.SliderTick);
  }, []);

  const handleRemovePress = useCallback(() => {
    if (isRemoveTokenDisabled) return;

    onRemovePress?.(token);
  }, [isRemoveTokenDisabled, onRemovePress, token]);

  return (
    <Box
      testID={`${BatchSellReviewSelectorsIDs.TOKEN_ROW}-${tokenKey}`}
      twClassName="gap-2 px-4 py-2"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
      >
        <AvatarToken
          name={token.symbol}
          src={token.image ? { uri: token.image } : undefined}
          size={AvatarTokenSize.Lg}
        />
        <Box twClassName="min-w-0 flex-1 gap-0.5">
          {isLoading ? (
            <Skeleton
              width={114}
              height={24}
              style={tw.style('rounded-lg')}
              testID={`${BatchSellReviewSelectorsIDs.TOKEN_AMOUNT_SKELETON}-${tokenKey}`}
            />
          ) : isQuoteUnavailable ? (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.ErrorDefault}
              numberOfLines={1}
            >
              {strings('bridge.batch_sell_no_quote_available')}
            </Text>
          ) : (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
              twClassName="min-w-0"
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
                twClassName="shrink"
              >
                {receivedAmount}
              </Text>
              {shouldShowHighPriceImpactTag && (
                <Pressable
                  onPress={onHighPriceImpactPress}
                  disabled={!onHighPriceImpactPress}
                  accessibilityRole="button"
                  accessibilityLabel={strings(
                    'bridge.batch_sell_high_price_impact',
                  )}
                  testID={`${BatchSellReviewSelectorsIDs.HIGH_PRICE_IMPACT_TAG}-${tokenKey}`}
                  style={({ pressed }) =>
                    tw.style(
                      'rounded-md bg-warning-muted px-1.5 py-0.5',
                      pressed && 'opacity-70',
                    )
                  }
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={1}
                  >
                    <Icon
                      name={IconName.Danger}
                      size={IconSize.Xs}
                      color={IconColor.WarningDefault}
                    />
                    <Text
                      variant={TextVariant.BodyXs}
                      color={TextColor.WarningDefault}
                      numberOfLines={1}
                    >
                      {strings('bridge.batch_sell_high_price_impact')}
                    </Text>
                  </Box>
                </Pressable>
              )}
            </Box>
          )}
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {balanceText}
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={4}
        >
          <ButtonIcon
            iconName={IconName.Customize}
            iconProps={{ color: IconColor.IconAlternative }}
            size={ButtonIconSize.Md}
            accessibilityLabel={strings('bridge.batch_sell_customize_token', {
              tokenSymbol: token.symbol,
            })}
            onPress={() => onSlippagePress?.(token)}
            testID={`${BatchSellReviewSelectorsIDs.CUSTOMIZE_BUTTON}-${tokenKey}`}
          />
          <ButtonIcon
            iconName={IconName.RemoveMinus}
            iconProps={{ color: IconColor.IconAlternative }}
            size={ButtonIconSize.Md}
            accessibilityLabel={strings('bridge.batch_sell_remove_token', {
              tokenSymbol: token.symbol,
            })}
            isDisabled={isRemoveTokenDisabled}
            onPress={handleRemovePress}
            testID={`${BatchSellReviewSelectorsIDs.REMOVE_BUTTON}-${tokenKey}`}
          />
        </Box>
      </Box>
      <Slider
        value={displayPercent}
        onValueChange={handleSliderValueChange}
        onDragEnd={handleSliderDragEnd}
        showRangeDots
        onGrip={handleSliderGrip}
        onMark={handleSliderMark}
        testID={`${BatchSellReviewSelectorsIDs.TOKEN_SLIDER}-${tokenKey}`}
      />
    </Box>
  );
}
