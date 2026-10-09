import { useMemo } from 'react';
import { formatPercent } from '../../SocialFeed/utils/formatters';
import { convertUsdToFiat, formatFiat } from './fiat';
import { computeUnrealizedPnl } from './unrealizedPnl';
import { useTraderPosition } from './useTraderPosition';
import { useUsdToFiatRate } from './useUsdToFiatRate';

export interface UnrealizedPnlView {
  /** Unrealized PnL in the display currency, or null when there is nothing to show. */
  valueFormatted: string | null;
  /** Unrealized percent. Never currency-converted. */
  percentFormatted: string | null;
  isProfit: boolean;
  /** Currency the value was formatted in. USD when the rate was missing. */
  currency: string;
  isLoading: boolean;
  error: string | null;
  /** False when the endpoint has no position, so the footer shows value only. */
  hasPosition: boolean;
  /** True when the selected currency had no rate and the value stayed in USD. */
  fellBackToUsd: boolean;
}

const EMPTY: UnrealizedPnlView = {
  valueFormatted: null,
  percentFormatted: null,
  isProfit: false,
  currency: 'usd',
  isLoading: false,
  error: null,
  hasPosition: false,
  fellBackToUsd: false,
};

/**
 * Display model for the position line. Reads the rate once per render and
 * converts the USD unrealized amount a single time.
 */
export const useUnrealizedPnl = (
  positionId: string | undefined,
): UnrealizedPnlView => {
  const { position, isLoading, error } = useTraderPosition(positionId);
  const conversion = useUsdToFiatRate();

  return useMemo(() => {
    if (!position) {
      return { ...EMPTY, currency: conversion.currency, isLoading, error };
    }

    const unrealized = computeUnrealizedPnl(position);
    if (unrealized.usd == null) {
      return {
        ...EMPTY,
        currency: conversion.currency,
        isLoading,
        error,
        hasPosition: true,
      };
    }

    const converted = convertUsdToFiat(unrealized.usd, conversion);

    return {
      valueFormatted: formatFiat(converted.value, converted.currency),
      percentFormatted:
        unrealized.percent == null ? null : formatPercent(unrealized.percent),
      isProfit: unrealized.usd > 0,
      currency: converted.currency,
      isLoading,
      error,
      hasPosition: true,
      fellBackToUsd:
        conversion.currency.toLowerCase() !== 'usd' &&
        converted.currency.toUpperCase() === 'USD',
    };
  }, [conversion, error, isLoading, position]);
};
