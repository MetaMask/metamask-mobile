import { useCallback, useEffect, useState } from 'react';
import { useCardSDK } from '../sdk';
import { AllowanceState, CardTokenAllowance } from '../types';
import Engine from '../../../../core/Engine';
import { Hex } from '@metamask/utils';
import { renderFromTokenMinimalUnit } from '../../../../util/number';
import Logger from '../../../../util/Logger';
import { useGetAllowances } from './useGetAllowances';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';
import BigNumber from 'bignumber.js';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';

/**
 * React hook to fetch and determine the priority card token for a given user address.
 *
 * This hook filters out zero-allowance tokens, queries the Card SDK for a suggested priority token,
 * then validates against on-chain balances. If the suggested token has zero balance,
 * it falls back to the first token with both allowance and positive balance.
 *
 * @param {string} [address] - Ethereum address of the user whose card token priority is to be fetched.
 * @returns {{
 * fetchPriorityToken: (cardTokenAllowances: CardTokenAllowance[]) => Promise<CardTokenAllowance | null>,
 * isLoading: boolean,
 * error: string | null
 * }}
 * An object containing:
 * - fetchPriorityToken: async function to compute the best token allowance entry
 * - isLoading: indicates loading state during the fetch
 * - error: any error encountered while fetching
 */
export const useGetPriorityCardToken = (selectedAddress?: string) => {
  const { sdk } = useCardSDK();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const { fetchAllowances } = useGetAllowances(selectedAddress);
  const chainId = useSelector(selectChainId);
  const [priorityToken, setPriorityToken] = useState<CardTokenAllowance | null>(
    null,
  );

  // Extract controller state
  const {
    state: { tokenBalances: allTokenBalances },
  } = Engine.context.TokenBalancesController;

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
        const cardTokenAllowances = await fetchAllowances();
        endTrace({
          name: TraceName.Card,
        });

        if (!cardTokenAllowances || cardTokenAllowances.length === 0) {
          const supportedTokens = sdk.supportedTokens;

          if (supportedTokens[0]) {
            return {
              ...supportedTokens[0],
              allowanceState: AllowanceState.NotEnabled,
              isStaked: false,
              chainId,
            } as CardTokenAllowance;
          }

          return null;
        }

        const validAllowances = filterNonZeroAllowances(cardTokenAllowances);
        if (validAllowances.length === 0) {
          return cardTokenAllowances[0] || null;
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
            return matchingAllowance;
          }

          const positiveBalanceAllowance =
            findFirstAllowanceWithPositiveBalance(
              validAllowances,
              chainBalances,
            );

          return positiveBalanceAllowance || matchingAllowance;
        }

        return cardTokenAllowances[0] || null;
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
    }, [sdk, selectedAddress, fetchAllowances, getBalancesForChain, chainId]);

  useEffect(() => {
    if (selectedAddress) {
      fetchPriorityToken().then((token) => {
        setPriorityToken(token);
      });
    }
  }, [selectedAddress, fetchPriorityToken]);

  return { fetchPriorityToken, isLoading, error, priorityToken };
};
