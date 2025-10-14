import { useCallback, useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import {
  AllowanceState,
  CardExternalWalletDetail,
  CardTokenAllowance,
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
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
  setCardPriorityToken,
  setCardPriorityTokenLastFetched,
} from '../../../../core/redux/slices/card';
import Engine from '../../../../core/Engine';
import { buildTokenIconUrl } from '../util/buildTokenIconUrl';
import { ethers } from 'ethers';
import { createSelector } from 'reselect';

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
export const useGetPriorityCardToken = () => {
  const dispatch = useDispatch();
  const { TokensController, NetworkController } = Engine.context;
  const { sdk, isAuthenticated, isLoading: isLoadingSDK } = useCardSDK();
  const [state, setState] = useState({
    isLoading: false,
    isLoadingAddToken: false,
    error: false,
  });
  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:0',
  )?.address;
  const selectCardHookState = useMemo(
    () =>
      createSelector(
        [
          selectAllTokenBalances,
          selectSelectedInternalAccountByScope,
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
        (
          allTokenBalances,
          selectedAccountByScope,
          priorityToken,
          lastFetched,
        ) => ({
          allTokenBalances,
          selectedAddress: selectedAccountByScope('eip155:0')?.address,
          priorityToken,
          lastFetched,
        }),
      ),
    [isAuthenticated, selectedAddress],
  );

  const cardState = useSelector(selectCardHookState);
  const { allTokenBalances, priorityToken, lastFetched } = cardState;

  // Helper to check if cache is still valid (less than 5 minutes old)
  const isCacheValid = useCallback(() => {
    if (!lastFetched) return false;
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
    // Handle both Date objects and ISO date strings (from redux-persist)
    const lastFetchedDate =
      lastFetched instanceof Date ? lastFetched : new Date(lastFetched);

    if (isAuthenticated) {
      return lastFetchedDate > thirtySecondsAgo;
    }

    return lastFetchedDate > fiveMinutesAgo;
  }, [lastFetched, isAuthenticated]);

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

  // Fetch priority token function on chain -- when user is not authenticated
  const fetchPriorityTokenOnChain: () => Promise<CardTokenAllowance | null> =
    useCallback(async () => {
      setState((prevState) => ({
        ...prevState,
        isLoading: true,
        error: false,
      }));

      if (!sdk || !selectedAddress) {
        setState((prevState) => ({ ...prevState, isLoading: false }));
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
        setState((prevState) => ({ ...prevState, error: true }));
        return null;
      } finally {
        setState((prevState) => ({ ...prevState, isLoading: false }));
      }
    }, [sdk, selectedAddress, getBalancesForChain, dispatch]);

  const mapCardExternalWalletDetailToCardTokenAllowance = (
    cardExternalWalletDetail: CardExternalWalletDetail | undefined,
  ): CardTokenAllowance | null => {
    if (!cardExternalWalletDetail?.tokenDetails) {
      return null;
    }

    // Convert decimal strings to integers before creating BigNumber
    // Handle potential decimal values by parsing as float and converting to integer string
    const allowanceFloat = parseFloat(
      cardExternalWalletDetail.allowance || '0',
    );
    const balanceFloat = parseFloat(cardExternalWalletDetail.balance || '0');

    // Ensure we have valid numbers and convert to integer strings
    const allowanceString = isNaN(allowanceFloat)
      ? '0'
      : Math.floor(allowanceFloat).toString();
    const balanceString = isNaN(balanceFloat)
      ? '0'
      : Math.floor(balanceFloat).toString();

    const allowance = ethers.BigNumber.from(allowanceString);
    const balance = ethers.BigNumber.from(balanceString);
    const allowanceState = allowance.isZero()
      ? AllowanceState.NotEnabled
      : allowance.lt(ARBITRARY_ALLOWANCE)
      ? AllowanceState.Limited
      : AllowanceState.Enabled;
    const availableBalance = Math.min(balance.toNumber(), allowance.toNumber());

    return {
      address: cardExternalWalletDetail.tokenDetails.address ?? '',
      decimals: cardExternalWalletDetail.tokenDetails.decimals ?? 0,
      symbol: cardExternalWalletDetail.tokenDetails.symbol ?? '',
      name: cardExternalWalletDetail.tokenDetails.name ?? '',
      walletAddress: cardExternalWalletDetail.walletAddress,
      allowanceState,
      allowance,
      availableBalance: ethers.BigNumber.from(availableBalance),
      isStaked: false,
      // TODO: Add solana chain id -- verify how to handle that because Solana doesn't have a chain id
      chainId: LINEA_CHAIN_ID,
    };
  };

  const fetchPriorityTokenAPI: () => Promise<CardTokenAllowance | null> =
    useCallback(async () => {
      try {
        setState((prevState) => ({
          ...prevState,
          isLoading: true,
          error: false,
        }));
        const cardExternalWalletDetails =
          await sdk?.getCardExternalWalletDetails();

        const mappedCardExternalWalletDetails =
          mapCardExternalWalletDetailToCardTokenAllowance(
            cardExternalWalletDetails?.[0],
          );

        setState((prevState) => ({ ...prevState, isLoading: false }));
        dispatch(
          setAuthenticatedPriorityToken(mappedCardExternalWalletDetails),
        );
        dispatch(setAuthenticatedPriorityTokenLastFetched(new Date()));
        return mappedCardExternalWalletDetails;
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
        }));
        return null;
      }
    }, [sdk, dispatch]);

  const fetchPriorityToken: () => Promise<CardTokenAllowance | null> =
    useCallback(async () => {
      if (isAuthenticated) {
        return fetchPriorityTokenAPI();
      }

      return fetchPriorityTokenOnChain();
    }, [isAuthenticated, fetchPriorityTokenAPI, fetchPriorityTokenOnChain]);

  useEffect(() => {
    const run = async () => {
      if (!selectedAddress || isLoadingSDK) {
        return;
      }

      // If cache is valid and we have a priority token, don't fetch
      if (cacheIsValid && priorityToken !== null) {
        return;
      }

      if (isAuthenticated) {
        await fetchPriorityTokenAPI();
      } else {
        await fetchPriorityTokenOnChain();
      }
    };

    run();
  }, [
    selectedAddress,
    cacheIsValid,
    priorityToken,
    fetchPriorityTokenOnChain,
    lastFetched,
    isAuthenticated,
    fetchPriorityTokenAPI,
    isLoadingSDK,
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
            setState((prevState) => ({
              ...prevState,
              isLoadingAddToken: true,
            }));
            await TokensController.addToken({
              address: priorityToken.address,
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
          }));
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
  const shouldShowLoading =
    state.isLoading && (!priorityToken || !cacheIsValid);

  const isLoadingFinal = useMemo(
    () => state.isLoadingAddToken || shouldShowLoading,
    [state.isLoadingAddToken, shouldShowLoading],
  );

  return {
    fetchPriorityToken,
    isLoading: isLoadingFinal,
    error: state.error,
    priorityToken,
  };
};
