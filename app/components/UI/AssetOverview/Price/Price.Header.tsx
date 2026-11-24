import React from 'react';
import { ChartType } from '../../Charts/AdvancedChart/AdvancedChart.types';
import { OHLCVBar } from '../../Charts/AdvancedChart/OHLCVBar/OHLCVBar';
import { TokenPriceTitleHub } from './TokenPriceTitleHub';
import { usePriceChartContext } from './Price.context';

export interface PriceHeaderProps {
  showPeriodLabel?: boolean;
}

/**
 * Price, change, and period label above the chart. Swaps between the line-mode
 * title, the candle crosshair readout, and the default candle title.
 */
export const PriceHeader = ({ showPeriodLabel = true }: PriceHeaderProps) => {
  const {
    ambientColor,
    changePercent,
    changePercentColor,
    chartLoading,
    chartType,
    comparePrice,
    crosshairData,
    currentCurrency,
    currentPrice,
    displayDate,
    displayDiff,
    displayPrice,
    dynamicComparePrice,
    getLinePriceDiffStyle,
    getPriceDiffStyle,
    isCrosshairActive,
    isLineMode,
    isLoading,
    isTechnicalIndicatorsEnabled,
    lineAmbientColor,
    lineTitleDate,
    lineTitleDiff,
    lineTitlePrice,
  } = usePriceChartContext();

  if (Number.isNaN(currentPrice)) {
    return null;
  }

  if (isLineMode) {
    return (
      <TokenPriceTitleHub
        price={lineTitlePrice}
        displayDiff={lineTitleDiff}
        comparePrice={comparePrice}
        periodLabel={showPeriodLabel ? lineTitleDate : undefined}
        currentCurrency={currentCurrency}
        isLoading={isLoading}
        ambientColor={lineAmbientColor}
        getPriceDiffStyle={getLinePriceDiffStyle}
      />
    );
  }

  if (isCrosshairActive && crosshairData) {
    return (
      <OHLCVBar
        data={crosshairData}
        currency={currentCurrency}
        changePercent={changePercent}
        changePercentColor={changePercentColor}
      />
    );
  }

  const isChangeLoadingValue = isTechnicalIndicatorsEnabled
    ? chartLoading
    : isLoading;

  return (
    <TokenPriceTitleHub
      price={displayPrice}
      displayDiff={displayDiff}
      comparePrice={
        dynamicComparePrice ??
        (chartType === ChartType.Candles ? comparePrice : null)
      }
      periodLabel={showPeriodLabel ? displayDate : undefined}
      currentCurrency={currentCurrency}
      isLoading={isLoading}
      isChangeLoading={isChangeLoadingValue}
      ambientColor={ambientColor}
      getPriceDiffStyle={getPriceDiffStyle}
      changeFormat="signedCurrency"
    />
  );
};
