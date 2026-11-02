import React from 'react';
import { useSelector } from 'react-redux';
import { selectMemecoinTdpV1PriceApiBaseUrl } from '../../../../selectors/featureFlagController/assetsMemecoinTdpV1';
import { PriceApiHostContext } from './PriceApiHostContext';

export interface PriceApiHostProviderProps {
  children?: React.ReactNode;
}

/**
 * Supplies the Price API host to the subtree it wraps.
 *
 * A provider rather than a prop because the host has to reach four requests
 * sitting at the bottom of unrelated call chains — market data, historical
 * prices, the OHLCV chart, and the `/latest` candle — three of which are
 * reached through components the legacy page shares. Threading it would have
 * put a permanent-looking prop on `Price.Provider` for something meant to be
 * deleted.
 *
 * Wrap only the branch that renders the V1 page. Scope is the whole mechanism:
 * being outside this provider is what keeps the legacy page on prod, so there
 * is no flag to read and no condition to get wrong at the call sites.
 */
export const PriceApiHostProvider = ({
  children,
}: PriceApiHostProviderProps) => {
  // A string, so the provider value is referentially stable across renders
  // without memoising and the subtree does not re-render on the context.
  const baseUrl = useSelector(selectMemecoinTdpV1PriceApiBaseUrl);

  return (
    <PriceApiHostContext.Provider value={baseUrl}>
      {children}
    </PriceApiHostContext.Provider>
  );
};
