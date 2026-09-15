import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { LIMIT_ORDER_NEAR_MARKET_PERCENT } from '../../constants/limitOrders';
import { LimitOrderPriceAdjustCardProps } from './types';
import { InputSection } from './InputSection';
import { ButtonPricePresetsSection } from './ButtonPricePresetsSection';
import { LimitOrderPriceAdjustCardSelectorsIDs } from './testIds';

export const LimitOrderPriceAdjustCard = ({
  hasVisibleBanner,
  onDismissKeypad,
  orderSide,
  quoteTokenSymbol,
  isLimitFiatMode,
  priceUnitSymbol,
  onQuoteUnitPress,
  limitPrice,
  onLimitPriceInputPress,
  limitPriceSelection,
  onLimitPriceSelectionChange,
  secondaryLimitPrice,
  onAmountTypeTogglePress,
  marketComparison,
  isTriggerPriceNearMarket = false,
  priceComparisonDirection,
  pricePresets,
  isCustomPercentActive,
  customPercent,
  customPercentSelection,
  onMarketPresetPress,
  onPercentPresetPress,
  onCustomPresetPress,
  onCustomPercentInputPress,
  onCustomPercentSelectionChange,
  limitPriceInputRef,
  customPercentInputRef,
}: LimitOrderPriceAdjustCardProps) => (
  <Box
    testID={LimitOrderPriceAdjustCardSelectorsIDs.CONTAINER}
    twClassName={
      hasVisibleBanner ? 'px-4 flex-grow-0 pb-3' : 'px-4 flex-grow-0'
    }
    onStartShouldSetResponder={() => true}
    onResponderRelease={onDismissKeypad}
  >
    <Box twClassName="relative flex-grow-0 rounded-lg bg-section p-3 gap-1">
      <InputSection
        ref={limitPriceInputRef}
        executionType={orderSide}
        quotedSymbol={quoteTokenSymbol}
        isLimitFiatMode={isLimitFiatMode}
        unitSymbol={priceUnitSymbol}
        value={limitPrice}
        selection={limitPriceSelection}
        onSelectionChange={onLimitPriceSelectionChange}
        onInputPress={onLimitPriceInputPress}
        secondaryValue={secondaryLimitPrice}
        onAmountTypeTogglePress={onAmountTypeTogglePress}
        onQuoteUnitPress={onQuoteUnitPress}
        onDismissKeypad={onDismissKeypad}
        marketComparison={marketComparison}
        priceComparisonDirection={priceComparisonDirection}
      />
      <ButtonPricePresetsSection
        ref={customPercentInputRef}
        executionType={orderSide}
        pricePresets={pricePresets}
        isCustomActive={isCustomPercentActive}
        customValue={customPercent}
        customSelection={customPercentSelection}
        onMarketPress={onMarketPresetPress}
        onPercentPress={onPercentPresetPress}
        onCustomPress={onCustomPresetPress}
        onCustomInputPress={onCustomPercentInputPress}
        onCustomSelectionChange={onCustomPercentSelectionChange}
      />
    </Box>
    {isTriggerPriceNearMarket ? (
      <BannerAlert
        testID={LimitOrderPriceAdjustCardSelectorsIDs.NEAR_MARKET_WARNING}
        severity={BannerAlertSeverity.Warning}
        description={strings('bridge.limit.trigger_price_near_market', {
          percent: LIMIT_ORDER_NEAR_MARKET_PERCENT,
        })}
        descriptionProps={{
          variant: TextVariant.BodySm,
          color: TextColor.TextDefault,
        }}
        twClassName="mt-3"
      />
    ) : null}
  </Box>
);
