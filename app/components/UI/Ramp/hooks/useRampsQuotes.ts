import { useCallback, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { debounce } from 'lodash';
import Engine from '../../../../core/Engine';
import {
  selectQuotes,
  selectQuotesRequest,
} from '../../../../selectors/rampsController';
import type { RampAction } from '@metamask/ramps-controller';
import type { RootState } from '../../../../reducers';

const DEBOUNCE_DELAY = 500; // 500ms debounce for amount changes

interface UseRampsQuotesOptions {
  assetId?: string;
  amount: number;
  walletAddress?: string;
  region?: string;
  fiat?: string;
  paymentMethods?: string[];
  provider?: string;
  action?: RampAction;
  enabled?: boolean;
}

export function useRampsQuotes(options: UseRampsQuotesOptions) {
  const quotes = useSelector(selectQuotes);

  // Build request params for the selector - only used when shouldTrackRequest is true
  const requestParams = useMemo(
    () => ({
      region: options.region,
      fiat: options.fiat,
      assetId: options.assetId,
      amount: options.amount,
      walletAddress: options.walletAddress,
      paymentMethods: options.paymentMethods,
      provider: options.provider,
      action: options.action ?? 'buy',
    }),
    [
      options.region,
      options.fiat,
      options.assetId,
      options.amount,
      options.walletAddress,
      options.paymentMethods,
      options.provider,
      options.action,
    ],
  );

  // Only track request state when we have the minimum required params
  const shouldTrackRequest =
    !!options.region &&
    !!options.fiat &&
    !!options.assetId &&
    options.amount > 0 &&
    !!options.walletAddress &&
    options.paymentMethods &&
    options.paymentMethods.length > 0;

  // Use conditional selector to avoid calling with invalid params
  const requestState = useSelector((state: RootState) => {
    if (!shouldTrackRequest) {
      return { data: null, isFetching: false, error: null };
    }
    return selectQuotesRequest({
      region: requestParams.region as string,
      fiat: requestParams.fiat as string,
      assetId: requestParams.assetId as string,
      amount: requestParams.amount,
      walletAddress: requestParams.walletAddress as string,
      paymentMethods: requestParams.paymentMethods as string[],
      provider: requestParams.provider,
      action: requestParams.action,
    })(state);
  });

  const { isFetching, error } = requestState;

  const fetchQuotes = useCallback(
    async (forceRefresh?: boolean) => {
      if (
        !options.enabled ||
        !options.assetId ||
        options.amount <= 0 ||
        !options.walletAddress
      ) {
        return;
      }

      await Engine.context.RampsController.getQuotes({
        assetId: options.assetId,
        amount: options.amount,
        walletAddress: options.walletAddress,
        region: options.region,
        fiat: options.fiat,
        paymentMethods: options.paymentMethods,
        provider: options.provider,
        action: options.action ?? 'buy',
        forceRefresh,
      });
    },
    [
      options.enabled,
      options.assetId,
      options.amount,
      options.walletAddress,
      options.region,
      options.fiat,
      options.paymentMethods,
      options.provider,
      options.action,
    ],
  );

  // Debounced version for amount changes
  const debouncedFetchQuotes = useMemo(
    () => debounce(() => fetchQuotes(true), DEBOUNCE_DELAY),
    [fetchQuotes],
  );

  // Cleanup debounce on unmount
  useEffect(() => () => debouncedFetchQuotes.cancel(), [debouncedFetchQuotes]);

  return {
    quotes,
    isFetchingQuotes: isFetching,
    quotesError: error,
    fetchQuotes,
    debouncedFetchQuotes,
  };
}
