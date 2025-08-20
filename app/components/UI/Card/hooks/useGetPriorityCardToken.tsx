import { useCallback, useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import { AllowanceState, CardTokenAllowance } from '../types';
import { Hex } from '@metamask/utils';
import { renderFromTokenMinimalUnit } from '../../../../util/number';
import Logger from '../../../../util/Logger';
import BigNumber from 'bignumber.js';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { selectAllTokenBalances } from '../../../../selectors/tokenBalancesController';
import { CardSDK } from '../sdk/CardSDK';
import { ARBITRARY_ALLOWANCE } from '../constants';
import {
  selectCardPriorityToken,
  selectCardPriorityTokenLastFetched,
  setCardPriorityToken,
  setCardPriorityTokenLastFetched,
} from '../../../../core/redux/slices/card';

/**
 * Fetches token allowances from the Card SDK and maps them to CardTokenAllowance objects.
 * @param {CardSDK} sdk - The Card SDK instance.
 * @param {string} selectedAddress - The user's Ethereum address.
 * @param {string} chainId - The chain ID for which to fetch allowances.
 * @returns {Promise<CardTokenAllowance[]>} - A promise that resolves to an array of CardTokenAllowance objects.
 */
const fetchAllowances = async (
  sdk: CardSDK,
  selectedAddress: string,
  chainId: string,
) => {
  try {
    trace({
      name: TraceName.Card,
      op: TraceOperation.CardGetSupportedTokensAllowances,
    });
    const supportedTokensAllowances = await sdk.getSupportedTokensAllowances(
      selectedAddress,
    );

    const supportedTokens = sdk.supportedTokens;

    const mappedAllowances = supportedTokensAllowances.map((token) => {
      const tokenInfo = supportedTokens.find(
        (supportedToken) => supportedToken.address === token.address,
      );
      const allowance = token.usAllowance.isZero()
        ? token.globalAllowance
        : token.usAllowance;
      let allowanceState;

      if (allowance.isZero()) {
        allowanceState = AllowanceState.NotEnabled;
      } else if (allowance.lt(ARBITRARY_ALLOWANCE)) {
        allowanceState = AllowanceState.Limited;
      } else {
        allowanceState = AllowanceState.Enabled;
      }

      if (!tokenInfo) {
        return null;
      }

      return {
        allowanceState,
        address: token.address,
        tag: allowanceState,
        isStaked: false,
        decimals: tokenInfo.decimals ?? null,
        name: tokenInfo.name ?? null,
        symbol: tokenInfo.symbol ?? null,
        allowance,
        chainId,
      };
    });

    const filteredAllowances = mappedAllowances.filter(
      Boolean,
    ) as CardTokenAllowance[];

    endTrace({
      name: TraceName.Card,
    });

    return filteredAllowances;
  } catch (error) {
    Logger.error(
      error as Error,
      'fetchAllowances::Failed to fetch token allowances',
    );
    throw new Error('Failed to fetch token allowances');
  }
};

/**
 * React hook to fetch and determine the priority card token for a given user address.
 *
 * This hook implements a caching strategy where if the priority token was fetched less than 5 minutes ago,
 * it returns the cached value. Otherwise, it fetches a new priority token from the Card SDK.
 *
 * @param {string} [address] - Ethereum address of the user whose card token priority is to be fetched.
 * @param {boolean} [shouldFetch=true] - Whether the hook should attempt to fetch if cache is stale.
 * @returns {{
 * fetchPriorityToken: () => Promise<CardTokenAllowance | null>,
 * isLoading: boolean,
 * error: boolean,
 * priorityToken: CardTokenAllowance | null
 * }}
 * An object containing:
 * - fetchPriorityToken: async function to manually refresh the priority token
 * - isLoading: indicates loading state during the fetch
 * - error: any error encountered while fetching
 * - priorityToken: the cached or newly fetched priority token
 */
export const useGetPriorityCardToken = (
  selectedAddress?: string,
  shouldFetch: boolean = true,
) => {
  const dispatch = useDispatch();
  const { sdk } = useCardSDK();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  // Extract controller state
  const allTokenBalances = useSelector(selectAllTokenBalances);
  const priorityToken = useSelector(selectCardPriorityToken);
  const lastFetched = useSelector(selectCardPriorityTokenLastFetched);

  // Helper to check if cache is still valid (less than 5 minutes old)
  const isCacheValid = useCallback(() => {
    if (!lastFetched) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    // Handle both Date objects and ISO date strings (from redux-persist)
    const lastFetchedDate =
      lastFetched instanceof Date ? lastFetched : new Date(lastFetched);
    return lastFetchedDate > fiveMinutesAgo;
  }, [lastFetched]);

  // Memoize cache validity to prevent unnecessary re-runs
  const cacheIsValid = useMemo(() => isCacheValid(), [isCacheValid]);

  // Helpers
  const filterNonZeroAllowances = (
    allowances: CardTokenAllowance[],
  ): CardTokenAllowance[] =>
    allowances.filter(({ allowance }) => allowance.gt(0));

  const getBalancesForChain = useCallback(
    (tokenChainId: Hex): Record<Hex, string> =>
      allTokenBalances?.[selectedAddress?.toLowerCase() as Hex]?.[
        tokenChainId?.toLowerCase() as Hex
      ] ?? {},
    [allTokenBalances, selectedAddress],
  );

  const findFirstAllowanceWithPositiveBalance = (
    allowances: CardTokenAllowance[],
    balances: Record<Hex, string>,
  ): CardTokenAllowance | undefined =>
    allowances.find(
      ({ allowance, address: tokenAddress }) =>
        allowance.gt(0) &&
        balances[tokenAddress as Hex] &&
        BigNumber(balances[tokenAddress as Hex]).gt(0),
    );

  // Fetch priority token function
  const fetchPriorityToken: () => Promise<CardTokenAllowance | null> =
    useCallback(async () => {
      setIsLoading(true);
      setError(false);

      if (!sdk || !selectedAddress) {
        setIsLoading(false);
        return null;
      }

      try {
        trace({
          name: TraceName.Card,
          op: TraceOperation.CardGetPriorityToken,
        });
        const cardTokenAllowances = await fetchAllowances(
          sdk,
          selectedAddress,
          LINEA_CHAIN_ID,
        );
        endTrace({
          name: TraceName.Card,
        });

        if (!cardTokenAllowances || cardTokenAllowances.length === 0) {
          const supportedTokens = sdk.supportedTokens;

          if (supportedTokens[0]) {
            const fallbackToken = {
              ...supportedTokens[0],
              allowanceState: AllowanceState.NotEnabled,
              isStaked: false,
              chainId: LINEA_CHAIN_ID,
            } as CardTokenAllowance;

            // Update cache with fallback token
            dispatch(setCardPriorityToken(fallbackToken));
            dispatch(setCardPriorityTokenLastFetched(new Date()));

            return fallbackToken;
          }

          dispatch(setCardPriorityToken(null));
          dispatch(setCardPriorityTokenLastFetched(new Date()));
          return null;
        }

        const validAllowances = filterNonZeroAllowances(cardTokenAllowances);
        if (validAllowances.length === 0) {
          const defaultToken = cardTokenAllowances[0] || null;
          dispatch(setCardPriorityToken(defaultToken));
          dispatch(setCardPriorityTokenLastFetched(new Date()));
          return defaultToken;
        }

        const validTokenAddresses = validAllowances.map(
          ({ address }) => address,
        );

        const suggestedPriorityToken = await sdk.getPriorityToken(
          selectedAddress,
          validTokenAddresses,
        );

        const matchingAllowance = suggestedPriorityToken
          ? validAllowances.find(
              ({ address }) =>
                address.toLowerCase() ===
                suggestedPriorityToken.address?.toLowerCase(),
            )
          : undefined;

        let finalToken: CardTokenAllowance | null = null;

        if (matchingAllowance) {
          const chainBalances = getBalancesForChain(
            matchingAllowance.chainId as Hex,
          );

          const rawTokenBalance =
            suggestedPriorityToken?.address &&
            chainBalances[suggestedPriorityToken.address as Hex]
              ? chainBalances[suggestedPriorityToken.address as Hex]
              : '0';
          const decimalTokenBalance = BigNumber(
            renderFromTokenMinimalUnit(
              rawTokenBalance,
              suggestedPriorityToken?.decimals || 6,
            ),
          );

          if (decimalTokenBalance.gt(0)) {
            finalToken = matchingAllowance;
          } else {
            const positiveBalanceAllowance =
              findFirstAllowanceWithPositiveBalance(
                validAllowances,
                chainBalances,
              );
            finalToken = positiveBalanceAllowance || matchingAllowance;
          }
        } else {
          finalToken = cardTokenAllowances[0] || null;
        }

        // Update cache with the final token and current timestamp
        dispatch(setCardPriorityToken(finalToken));
        dispatch(setCardPriorityTokenLastFetched(new Date()));

        return finalToken;
      } catch (err) {
        const normalizedError =
          err instanceof Error ? err : new Error(String(err));
        Logger.error(
          normalizedError,
          'useGetPriorityCardToken::error fetching priority token',
        );
        setError(true);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [sdk, selectedAddress, getBalancesForChain, dispatch]);

  useEffect(() => {
    if (!selectedAddress || !shouldFetch) {
      return;
    }

    Logger.log('CardToken Cache Check:', {
      selectedAddress,
      shouldFetch,
      cacheIsValid,
      hasPriorityToken: !!priorityToken,
      lastFetched,
    });

    // If cache is valid and we have a priority token, don't fetch
    if (cacheIsValid && priorityToken !== null) {
      return;
    }

    // Cache is stale or we don't have a priority token, fetch new data
    fetchPriorityToken();
  }, [
    selectedAddress,
    shouldFetch,
    cacheIsValid,
    priorityToken,
    fetchPriorityToken,
    lastFetched,
  ]);

  // Determine if we should show loading state
  // Only show loading if we're actively fetching AND don't have cached data
  const shouldShowLoading = isLoading && (!priorityToken || !cacheIsValid);

  return {
    fetchPriorityToken,
    isLoading: shouldShowLoading,
    error,
    priorityToken,
  };
};
