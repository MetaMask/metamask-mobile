import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import {
  AllowanceState,
  CardTokenAllowance,
  CardExternalWalletDetail,
} from '../types';
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
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import {
  selectCardPriorityToken,
  selectCardPriorityTokenLastFetched,
  setCardPriorityToken,
  setCardPriorityTokenLastFetched,
} from '../../../../core/redux/slices/card';
import Engine from '../../../../core/Engine';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';
import { ethers } from 'ethers';

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
 * Maps CardExternalWalletDetail from API to CardTokenAllowance format
 * @param {CardExternalWalletDetail} walletDetail - The wallet detail from API
 * @param {CardSDK} sdk - The Card SDK instance to get supported token info
 * @returns {CardTokenAllowance | null} - Mapped token allowance or null if invalid
 */
const mapWalletDetailToCardToken = (
  walletDetail: CardExternalWalletDetail,
  sdk: CardSDK,
): CardTokenAllowance | null => {
  try {
    Logger.log('mapWalletDetailToCardToken: Mapping wallet detail:', {
      walletAddress: walletDetail.address,
      currency: walletDetail.currency,
      balance: walletDetail.balance,
      allowance: walletDetail.allowance,
    });

    // Find matching supported token by symbol (currency field contains token symbol)
    const supportedToken = sdk.supportedTokens.find(
      (token) =>
        token.symbol?.toLowerCase() === walletDetail.currency?.toLowerCase(),
    );

    if (!supportedToken) {
      Logger.log(
        'mapWalletDetailToCardToken: No matching supported token found for currency:',
        walletDetail.currency,
        'Available supported tokens:',
        sdk.supportedTokens.map((t) => t.symbol),
      );
      return null;
    }

    Logger.log('mapWalletDetailToCardToken: Found matching token:', {
      symbol: supportedToken.symbol,
      address: supportedToken.address,
      name: supportedToken.name,
    });

    // Parse allowance string to BigNumber, handling decimal values
    let allowanceBigNumber: ethers.BigNumber;
    try {
      const allowanceString = String(walletDetail.allowance || '0');
      // Convert decimal to integer if needed
      const allowanceFloat = parseFloat(allowanceString);
      if (isNaN(allowanceFloat) || allowanceFloat < 0) {
        allowanceBigNumber = ethers.BigNumber.from('0');
      } else {
        // Floor the float to get integer value
        const allowanceInt = Math.floor(allowanceFloat);
        allowanceBigNumber = ethers.BigNumber.from(allowanceInt.toString());
      }
    } catch (error) {
      Logger.log('mapWalletDetailToCardToken: Error parsing allowance:', error);
      allowanceBigNumber = ethers.BigNumber.from('0');
    }

    // Determine allowance state
    const allowanceState = allowanceBigNumber.gt(0)
      ? AllowanceState.Enabled
      : AllowanceState.NotEnabled;

    const cardTokenAllowance: CardTokenAllowance = {
      ...supportedToken,
      address: supportedToken.address || '', // Use token contract address, not user wallet address
      decimals: supportedToken.decimals ?? 18, // Default to 18 if not provided
      name: supportedToken.name ?? null,
      symbol: supportedToken.symbol ?? null,
      allowance: allowanceBigNumber,
      allowanceState,
      chainId: LINEA_CHAIN_ID,
      isStaked: false, // API doesn't provide staking info, default to false
    };

    return cardTokenAllowance;
  } catch (error) {
    Logger.log(
      'mapWalletDetailToCardToken: Error mapping wallet detail:',
      error,
    );
    return null;
  }
};

/**
 * React hook to fetch and determine the priority card token for a given user address.
 *
 * This hook implements a caching strategy where if the priority token was fetched less than 5 minutes ago,
 * it returns the cached value. Otherwise, it fetches a new priority token from the Card SDK.
 *
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
interface UseGetPriorityCardTokenParams {
  dataSource?: 'on-chain' | 'api';
}

export const useGetPriorityCardToken = (
  params?: UseGetPriorityCardTokenParams,
) => {
  const dataSource = params?.dataSource || 'on-chain';
  const dispatch = useDispatch();
  const { TokensController, NetworkController } = Engine.context;
  const { sdk } = useCardSDK();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingAddToken, setIsLoadingAddToken] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  // Ref to prevent multiple concurrent fetches and track current data source
  const fetchingRef = useRef<{
    inProgress: boolean;
    dataSource: string;
    lastFetchTime: number;
    lastFetchKey: string; // Unique key to identify each fetch request
  }>({
    inProgress: false,
    dataSource: '',
    lastFetchTime: 0,
    lastFetchKey: '',
  });

  // Track previous data source to detect changes (e.g., logout switching from API to on-chain)
  const previousDataSourceRef = useRef<string>(dataSource);

  // Add a minimum interval between fetches to prevent rapid switching
  const MIN_FETCH_INTERVAL = 1000; // 1 second

  // Extract controller state
  const allTokenBalances = useSelector(selectAllTokenBalances);
  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:0',
  )?.address;
  const priorityToken = useSelector(selectCardPriorityToken(selectedAddress));
  const lastFetched = useSelector(
    selectCardPriorityTokenLastFetched(selectedAddress),
  );

  // Helper to check if cache is still valid (less than 5 minutes old)
  const isCacheValid = useCallback(() => {
    if (!lastFetched) return false;
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
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

  // Fetch priority token from API
  const fetchPriorityTokenFromApi =
    useCallback(async (): Promise<CardTokenAllowance | null> => {
      if (!sdk || !selectedAddress) {
        return null;
      }

      try {
        trace({
          name: TraceName.Card,
          op: TraceOperation.CardGetPriorityToken,
        });

        const walletDetails = await sdk.getCardExternalWalletDetails();

        if (!walletDetails || walletDetails.length === 0) {
          Logger.log('fetchPriorityTokenFromApi: No wallet details found');
          return null;
        }

        Logger.log(
          'fetchPriorityTokenFromApi: Available wallet details:',
          walletDetails.map((w) => ({
            currency: w.currency,
            priority: w.priority,
            balance: w.balance,
            allowance: w.allowance,
          })),
        );

        // Find the priority token (lowest priority number = highest precedence)
        const priorityWallet = walletDetails.reduce((prev, current) =>
          current.priority < prev.priority ? current : prev,
        );

        Logger.log('fetchPriorityTokenFromApi: Selected priority token:', {
          currency: priorityWallet.currency,
          priority: priorityWallet.priority,
          balance: priorityWallet.balance,
          allowance: priorityWallet.allowance,
        });

        const mappedToken = mapWalletDetailToCardToken(priorityWallet, sdk);

        endTrace({
          name: TraceName.Card,
        });

        return mappedToken;
      } catch (fetchError) {
        Logger.log(
          'fetchPriorityTokenFromApi: Error fetching from API:',
          fetchError,
        );
        endTrace({
          name: TraceName.Card,
        });
        throw fetchError;
      }
    }, [sdk, selectedAddress]);

  // Fetch priority token from on-chain data
  const fetchPriorityTokenFromOnChain =
    useCallback(async (): Promise<CardTokenAllowance | null> => {
      if (!sdk || !selectedAddress) {
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
            dispatch(
              setCardPriorityToken({
                address: selectedAddress,
                token: fallbackToken,
              }),
            );
            dispatch(
              setCardPriorityTokenLastFetched({
                address: selectedAddress,
                lastFetched: new Date(),
              }),
            );

            return fallbackToken;
          }

          dispatch(
            setCardPriorityToken({
              address: selectedAddress,
              token: null,
            }),
          );
          dispatch(
            setCardPriorityTokenLastFetched({
              address: selectedAddress,
              lastFetched: new Date(),
            }),
          );
          return null;
        }

        const validAllowances = filterNonZeroAllowances(cardTokenAllowances);
        if (validAllowances.length === 0) {
          const defaultToken = cardTokenAllowances[0] || null;
          dispatch(
            setCardPriorityToken({
              address: selectedAddress,
              token: defaultToken,
            }),
          );
          dispatch(
            setCardPriorityTokenLastFetched({
              address: selectedAddress,
              lastFetched: new Date(),
            }),
          );
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
        dispatch(
          setCardPriorityToken({
            address: selectedAddress,
            token: finalToken,
          }),
        );
        dispatch(
          setCardPriorityTokenLastFetched({
            address: selectedAddress,
            lastFetched: new Date(),
          }),
        );

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

  // Internal fetch function that accepts data source parameter
  const internalFetchPriorityToken = useCallback(
    async (currentDataSource: string): Promise<CardTokenAllowance | null> => {
      const now = Date.now();
      const fetchKey = `${currentDataSource}-${now}-${Math.random()}`;

      Logger.log(
        'useGetPriorityCardToken: Fetch requested for',
        currentDataSource,
        'key:',
        fetchKey,
      );

      // Prevent concurrent fetches for the same data source
      if (
        fetchingRef.current.inProgress &&
        fetchingRef.current.dataSource === currentDataSource
      ) {
        Logger.log(
          'useGetPriorityCardToken: Fetch already in progress for',
          currentDataSource,
          'current key:',
          fetchingRef.current.lastFetchKey,
        );
        return priorityToken;
      }

      // Prevent rapid successive fetches (but allow if data source changed)
      if (
        now - fetchingRef.current.lastFetchTime < MIN_FETCH_INTERVAL &&
        fetchingRef.current.dataSource === currentDataSource
      ) {
        Logger.log(
          'useGetPriorityCardToken: Skipping fetch due to rate limiting for',
          currentDataSource,
        );
        return priorityToken;
      }

      // Set fetch state
      fetchingRef.current.inProgress = true;
      fetchingRef.current.dataSource = currentDataSource;
      fetchingRef.current.lastFetchTime = now;
      fetchingRef.current.lastFetchKey = fetchKey;

      setIsLoading(true);
      setError(false);

      try {
        let result: CardTokenAllowance | null = null;

        if (currentDataSource === 'api') {
          Logger.log('useGetPriorityCardToken: Fetching from API');
          result = await fetchPriorityTokenFromApi();
        } else {
          Logger.log('useGetPriorityCardToken: Fetching from on-chain');
          result = await fetchPriorityTokenFromOnChain();
        }

        // Only update cache if this fetch is still relevant (data source and key match)
        if (
          fetchingRef.current.dataSource === currentDataSource &&
          fetchingRef.current.lastFetchKey === fetchKey &&
          selectedAddress
        ) {
          Logger.log(
            'useGetPriorityCardToken: Updating cache for',
            currentDataSource,
            'key:',
            fetchKey,
          );
          dispatch(
            setCardPriorityToken({
              address: selectedAddress,
              token: result,
            }),
          );
          dispatch(
            setCardPriorityTokenLastFetched({
              address: selectedAddress,
              lastFetched: new Date(),
            }),
          );
        } else {
          Logger.log(
            'useGetPriorityCardToken: Skipping cache update - fetch superseded',
            {
              currentDataSource,
              fetchKey,
              currentKey: fetchingRef.current.lastFetchKey,
            },
          );
        }

        return result;
      } catch (err) {
        const normalizedError =
          err instanceof Error ? err : new Error(String(err));
        Logger.error(
          normalizedError,
          `useGetPriorityCardToken::error fetching priority token from ${currentDataSource}`,
        );
        setError(true);
        return null;
      } finally {
        // Only reset fetch state if this is still the current fetch
        if (
          fetchingRef.current.dataSource === currentDataSource &&
          fetchingRef.current.lastFetchKey === fetchKey
        ) {
          fetchingRef.current.inProgress = false;
        }
        setIsLoading(false);
      }
    },
    [
      priorityToken,
      selectedAddress,
      fetchPriorityTokenFromApi,
      fetchPriorityTokenFromOnChain,
      dispatch,
    ],
  );

  // External fetch function that always uses current dataSource
  const fetchPriorityToken = useCallback(
    async (): Promise<CardTokenAllowance | null> =>
      await internalFetchPriorityToken(dataSource),
    [dataSource, internalFetchPriorityToken],
  );

  // Separate effect to handle data source changes and fetching
  useEffect(() => {
    if (!selectedAddress || !sdk) {
      return;
    }

    // Check if we're already fetching for this data source
    if (
      fetchingRef.current.inProgress &&
      fetchingRef.current.dataSource === dataSource
    ) {
      Logger.log('useGetPriorityCardToken: Already fetching for', dataSource);
      return;
    }

    // Check if data source changed (e.g., logout switching from API to on-chain)
    const dataSourceChanged = previousDataSourceRef.current !== dataSource;
    if (dataSourceChanged) {
      Logger.log(
        'useGetPriorityCardToken: Data source changed from',
        previousDataSourceRef.current,
        'to',
        dataSource,
      );
      previousDataSourceRef.current = dataSource;
    }

    Logger.log(
      'useGetPriorityCardToken: Effect triggered - checking fetch conditions',
      {
        dataSource,
        selectedAddress: selectedAddress.slice(0, 6) + '...',
        cacheIsValid,
        hasPriorityToken: priorityToken !== null,
        dataSourceChanged,
        currentFetchState: fetchingRef.current,
      },
    );

    // For API data source, always fetch fresh data (no caching)
    if (dataSource === 'api') {
      Logger.log('useGetPriorityCardToken: API mode - fetching fresh data');
      internalFetchPriorityToken(dataSource);
      return;
    }

    // For on-chain data source, use cache strategy BUT force fetch if data source changed
    // If cache is valid and we have a priority token AND data source didn't change, don't fetch
    if (cacheIsValid && priorityToken !== null && !dataSourceChanged) {
      Logger.log('useGetPriorityCardToken: On-chain mode - using cached data');
      return;
    }

    // Cache is stale, we don't have a priority token, or data source changed - fetch new data
    const reason = dataSourceChanged
      ? 'data source changed (likely logout)'
      : !priorityToken
      ? 'no priority token'
      : 'cache is stale';
    Logger.log(
      'useGetPriorityCardToken: On-chain mode - fetching fresh data, reason:',
      reason,
    );
    internalFetchPriorityToken(dataSource);
  }, [
    selectedAddress,
    dataSource,
    cacheIsValid,
    priorityToken,
    lastFetched,
    sdk,
    internalFetchPriorityToken,
  ]);

  // Add priorityToken to the TokenListController if it exists
  useEffect(() => {
    let isCancelled = false;

    const addToken = async () => {
      try {
        if (priorityToken && !isCancelled) {
          const { allTokens } = TokensController.state;
          const allTokensPerChain =
            allTokens[priorityToken.chainId as Hex] || {};
          const allTokensPerAddress =
            allTokensPerChain[selectedAddress?.toLowerCase() as Hex] || [];
          const isNotOnAllTokens = !allTokensPerAddress?.find(
            (token) =>
              token.address?.toLowerCase() ===
              priorityToken.address?.toLowerCase(),
          );

          if (isNotOnAllTokens && !isCancelled) {
            const iconUrl = buildTokenIconUrl(
              priorityToken.chainId,
              priorityToken.address,
            );
            const networkClientId =
              NetworkController.findNetworkClientIdByChainId(
                priorityToken.chainId as Hex,
              );
            setIsLoadingAddToken(true);
            await TokensController.addToken({
              address: priorityToken.address,
              symbol: priorityToken.symbol as string,
              decimals: priorityToken.decimals as number,
              name: priorityToken.name as string,
              image: iconUrl,
              networkClientId,
            });
            if (!isCancelled) {
              setIsLoadingAddToken(false);
            }
          }
        }
      } catch (err) {
        if (!isCancelled) {
          const normalizedError =
            err instanceof Error ? err : new Error(String(err));
          Logger.error(
            normalizedError,
            'useGetPriorityCardToken::error adding priority token',
          );
          setIsLoadingAddToken(false);
          setError(true);
        }
      }
    };

    addToken();

    return () => {
      isCancelled = true;
    };
  }, [priorityToken, TokensController, NetworkController, selectedAddress]);

  // Determine if we should show loading state
  // Only show loading if we're actively fetching AND don't have cached data
  const shouldShowLoading = isLoading && (!priorityToken || !cacheIsValid);

  const isLoadingFinal = useMemo(
    () => isLoadingAddToken || shouldShowLoading,
    [isLoadingAddToken, shouldShowLoading],
  );

  return {
    fetchPriorityToken,
    isLoading: isLoadingFinal,
    error,
    priorityToken,
  };
};
