import { useCallback, useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import {
  AllowanceState,
  CardTokenAllowance,
  CardWarning,
  CardExternalWalletDetail,
} from '../types';
import { CaipChainId, Hex } from '@metamask/utils';
import { renderFromTokenMinimalUnit } from '../../../../util/number';
import Logger from '../../../../util/Logger';
import BigNumber from 'bignumber.js';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { selectAllTokenBalances } from '../../../../selectors/tokenBalancesController';
import { CardSDK } from '../sdk/CardSDK';
import {
  ARBITRARY_ALLOWANCE,
  AUTHENTICATED_CACHE_DURATION,
  UNAUTHENTICATED_CACHE_DURATION,
} from '../constants';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import {
  selectCardPriorityToken,
  selectCardPriorityTokenLastFetched,
  selectIsAuthenticatedCard,
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
  setCardPriorityToken,
  setCardPriorityTokenLastFetched,
} from '../../../../core/redux/slices/card';
import Engine from '../../../../core/Engine';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';
import { createSelector } from 'reselect';
import {
  isSolanaChainId,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';
import { safeFormatChainIdToHex } from '../util/safeFormatChainIdToHex';

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
    const supportedTokensAllowances =
      await sdk.getSupportedTokensAllowances(selectedAddress);

    const supportedTokens = sdk.getSupportedTokensByChainId(sdk.lineaChainId);

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
        allowance: allowance.toString(),
        caipChainId: chainId,
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

interface State {
  isLoading: boolean;
  isLoadingAddToken: boolean;
  error: boolean;
  warning: CardWarning | null;
}

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
export const useGetPriorityCardToken = (
  externalWalletDetailsData?: {
    walletDetails?: CardExternalWalletDetail[];
    mappedWalletDetails?: CardTokenAllowance[];
    priorityWalletDetail?: CardTokenAllowance | null;
  } | null,
) => {
  const dispatch = useDispatch();
  const { TokensController, NetworkController } = Engine.context;
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const { sdk } = useCardSDK();
  const [state, setState] = useState<State>({
    isLoading: false,
    isLoadingAddToken: false,
    error: false,
    warning: null,
  });
  const [allTokensWithAllowances, setAllTokensWithAllowances] = useState<
    CardTokenAllowance[] | null
  >(null);
  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:0',
  )?.address;
  const selectCardHookState = useMemo(
    () =>
      createSelector(
        [
          selectAllTokenBalances,
          (rootState) =>
            selectCardPriorityToken(
              isAuthenticated,
              selectedAddress,
            )(rootState),
          (rootState) =>
            selectCardPriorityTokenLastFetched(
              isAuthenticated,
              selectedAddress,
            )(rootState),
        ],
        (allTokenBalances, priorityToken, lastFetched) => ({
          allTokenBalances,
          priorityToken,
          lastFetched,
        }),
      ),
    [isAuthenticated, selectedAddress],
  );

  const cardState = useSelector(selectCardHookState);
  const { allTokenBalances, priorityToken, lastFetched } = cardState;

  // Helper to check if cache is still valid
  // Cache is only valid if we have both a recent lastFetched AND an actual token
  const isCacheValid = useCallback(() => {
    if (!lastFetched || !priorityToken) return false;
    const now = Date.now();
    // Handle both Date objects and ISO date strings (from redux-persist)
    const lastFetchedTime =
      lastFetched instanceof Date
        ? lastFetched.getTime()
        : new Date(lastFetched).getTime();

    const cacheDuration = isAuthenticated
      ? AUTHENTICATED_CACHE_DURATION
      : UNAUTHENTICATED_CACHE_DURATION;
    const cacheExpiry = now - cacheDuration;
    return lastFetchedTime > cacheExpiry;
  }, [lastFetched, priorityToken, isAuthenticated]);

  const cacheIsValid = isCacheValid();

  // Helpers
  const filterNonZeroAllowances = (
    allowances: CardTokenAllowance[],
  ): CardTokenAllowance[] =>
    allowances.filter(({ allowance }) => parseFloat(allowance) > 0);

  const getBalancesForChain = useCallback(
    (tokenChainId: CaipChainId): Record<Hex, string> =>
      allTokenBalances?.[selectedAddress?.toLowerCase() as Hex]?.[
        safeFormatChainIdToHex(tokenChainId) as `0x${string}`
      ] ?? {},
    [allTokenBalances, selectedAddress],
  );

  const findFirstAllowanceWithPositiveBalance = (
    allowances: CardTokenAllowance[],
    balances: Record<Hex, string>,
  ): CardTokenAllowance | undefined =>
    allowances.find(
      ({ allowance, address: tokenAddress }) =>
        parseFloat(allowance) > 0 &&
        balances[tokenAddress as Hex] &&
        BigNumber(balances[tokenAddress as Hex]).gt(0),
    );

  // Fetch priority token function on chain -- when user is not authenticated
  const fetchPriorityTokenOnChain: () => Promise<CardTokenAllowance | null> =
    useCallback(async () => {
      setState((prevState) => ({
        ...prevState,
        isLoading: true,
        error: false,
        warning: null,
      }));

      if (!sdk || !selectedAddress) {
        setState((prevState) => ({
          ...prevState,
          isLoading: false,
          warning: null,
        }));
        return null;
      }

      try {
        trace({
          name: TraceName.Card,
          op: TraceOperation.CardGetPriorityToken,
        });

        // Fetch all token allowances for unauthenticated users
        const cardTokenAllowances = await fetchAllowances(
          sdk,
          selectedAddress,
          formatChainIdToCaip(CHAIN_IDS.LINEA_MAINNET),
        );

        // Store all tokens for asset selection
        setAllTokensWithAllowances(cardTokenAllowances);

        endTrace({
          name: TraceName.Card,
        });

        if (!cardTokenAllowances || cardTokenAllowances.length === 0) {
          const supportedTokens = sdk.getSupportedTokensByChainId(
            sdk.lineaChainId,
          );

          if (supportedTokens[0]) {
            const fallbackToken = {
              ...supportedTokens[0],
              allowanceState: AllowanceState.NotEnabled,
              isStaked: false,
              caipChainId: formatChainIdToCaip(CHAIN_IDS.LINEA_MAINNET),
              allowance: '0',
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

            setState((prevState) => ({ ...prevState, isLoading: false }));
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
          setState((prevState) => ({ ...prevState, isLoading: false }));
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
          setState((prevState) => ({ ...prevState, isLoading: false }));
          return defaultToken;
        }

        const validTokenAddresses = validAllowances.map(
          ({ address }) => address,
        );

        const suggestedPriorityToken = await sdk.getPriorityToken(
          selectedAddress,
          validTokenAddresses as string[],
        );

        const matchingAllowance = suggestedPriorityToken
          ? validAllowances.find(
              ({ address }) =>
                address?.toLowerCase() ===
                suggestedPriorityToken.address?.toLowerCase(),
            )
          : undefined;

        let finalToken: CardTokenAllowance | null = null;

        if (matchingAllowance) {
          const chainBalances = getBalancesForChain(
            matchingAllowance.caipChainId,
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
            finalToken = positiveBalanceAllowance ?? matchingAllowance;
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

        setState((prevState) => ({ ...prevState, isLoading: false }));
        return finalToken;
      } catch (err) {
        const normalizedError =
          err instanceof Error ? err : new Error(String(err));
        Logger.error(
          normalizedError,
          'useGetPriorityCardToken::error fetching priority token',
        );
        setState((prevState) => ({
          ...prevState,
          error: true,
          isLoading: false,
        }));
        return null;
      }
    }, [sdk, selectedAddress, getBalancesForChain, dispatch]);

  const fetchPriorityTokenAPI: () => Promise<CardTokenAllowance | null> =
    useCallback(async () => {
      try {
        setState((prevState) => ({
          ...prevState,
          isLoading: true,
          error: false,
          warning: null,
        }));

        // Use provided data if available (to avoid duplicate calls)
        let priorityWalletDetail: CardTokenAllowance | null = null;

        if (externalWalletDetailsData?.priorityWalletDetail) {
          priorityWalletDetail = externalWalletDetailsData.priorityWalletDetail;
        }

        const warning = !priorityWalletDetail
          ? CardWarning.NeedDelegation
          : null;

        setState((prevState) => ({
          ...prevState,
          isLoading: false,
          warning,
        }));

        dispatch(setAuthenticatedPriorityToken(priorityWalletDetail));
        dispatch(setAuthenticatedPriorityTokenLastFetched(new Date()));
        return priorityWalletDetail;
      } catch (err) {
        const normalizedError =
          err instanceof Error ? err : new Error(String(err));
        Logger.error(
          normalizedError,
          'useGetPriorityCardToken::error fetching priority token API',
        );
        setState((prevState) => ({
          ...prevState,
          isLoading: false,
          error: true,
          warning: null,
        }));
        return null;
      }
    }, [externalWalletDetailsData, dispatch]);

  const fetchPriorityToken: () => Promise<CardTokenAllowance | null> =
    useCallback(async () => {
      if (isAuthenticated) {
        return fetchPriorityTokenAPI();
      }

      return fetchPriorityTokenOnChain();
    }, [isAuthenticated, fetchPriorityTokenAPI, fetchPriorityTokenOnChain]);

  // Sync authenticated priority token from external wallet data
  useEffect(() => {
    if (!isAuthenticated || !externalWalletDetailsData) {
      return;
    }

    const priorityWalletDetail = externalWalletDetailsData.priorityWalletDetail;
    const warning = !priorityWalletDetail ? CardWarning.NeedDelegation : null;

    setState((prevState) => ({
      ...prevState,
      warning,
    }));

    dispatch(setAuthenticatedPriorityToken(priorityWalletDetail ?? null));
    dispatch(setAuthenticatedPriorityTokenLastFetched(new Date()));
  }, [isAuthenticated, externalWalletDetailsData, dispatch]);

  // Auto-fetch on-chain priority token for unauthenticated users
  useEffect(() => {
    const run = async () => {
      if (isAuthenticated || !selectedAddress || !sdk) {
        return;
      }

      // If cache is still valid, don't fetch
      if (cacheIsValid) {
        return;
      }

      // Unauthenticated mode: Fetch on-chain priority token when cache invalid
      await fetchPriorityTokenOnChain();
    };

    run();
  }, [
    isAuthenticated,
    selectedAddress,
    cacheIsValid,
    sdk,
    fetchPriorityTokenOnChain,
  ]);

  // Add priorityToken to the TokenListController if it exists
  useEffect(() => {
    let isCancelled = false;

    const addToken = async () => {
      try {
        if (priorityToken && !isCancelled) {
          if (
            priorityToken.caipChainId &&
            isSolanaChainId(priorityToken.caipChainId)
          ) {
            // Solana tokens are not supported in the TokenListController
            return;
          }

          // Ensure chainId is in Hex format (convert from CAIP if needed)
          // This handles cases where chainId might be in "eip155:59144" format
          const hexChainId = safeFormatChainIdToHex(
            priorityToken.caipChainId,
          ) as `0x${string}`;

          const { allTokens } = TokensController.state;
          const allTokensPerChain = allTokens[hexChainId as Hex] || {};
          const allTokensPerAddress =
            allTokensPerChain[selectedAddress?.toLowerCase() as Hex] || [];
          const isNotOnAllTokens = !allTokensPerAddress?.find(
            (token) =>
              token.address?.toLowerCase() ===
              priorityToken.address?.toLowerCase(),
          );

          if (isNotOnAllTokens && !isCancelled) {
            const iconUrl = buildTokenIconUrl(
              priorityToken.caipChainId,
              priorityToken.address ?? '',
            );
            const networkClientId =
              NetworkController.findNetworkClientIdByChainId(hexChainId as Hex);
            setState((prevState) => ({
              ...prevState,
              isLoadingAddToken: true,
            }));
            await TokensController.addToken({
              address: priorityToken.address ?? '',
              symbol: priorityToken.symbol as string,
              decimals: priorityToken.decimals as number,
              name: priorityToken.name as string,
              image: iconUrl,
              networkClientId,
            });
            if (!isCancelled) {
              setState((prevState) => ({
                ...prevState,
                isLoadingAddToken: false,
              }));
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
          setState((prevState) => ({
            ...prevState,
            isLoadingAddToken: false,
            error: true,
            warning: null,
          }));
        }
      } finally {
        setState((prevState) => ({
          ...prevState,
          isLoadingAddToken: false,
        }));
      }
    };

    addToken();

    return () => {
      isCancelled = true;
    };
  }, [priorityToken, TokensController, NetworkController, selectedAddress]);

  // Determine if we should show loading state
  // Only show loading if we're actively fetching AND don't have cached data
  const shouldShowLoading =
    state.isLoading && (!priorityToken || !cacheIsValid);

  const isLoadingFinal = useMemo(
    () => state.isLoadingAddToken || shouldShowLoading,
    [state.isLoadingAddToken, shouldShowLoading],
  );

  return {
    fetchPriorityToken,
    priorityToken,
    allTokensWithAllowances,
    isLoading: isLoadingFinal,
    error: state.error,
    warning: state.warning,
  };
};
