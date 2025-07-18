import { useCallback } from 'react';
import { useCardSDK } from '../sdk';
import { CardTokenAllowance, AllowanceState } from '../types';
import { ARBITRARY_ALLOWANCE } from '../constants';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';
import Logger from '../../../../util/Logger';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';

/**
 * Hook to retrieve allowances for supported tokens.
 */
export const useGetAllowances = (selectedAddress?: string) => {
  const { sdk } = useCardSDK();
  const chainId = useSelector(selectChainId);

  const fetchAllowances = useCallback(async () => {
    if (sdk && selectedAddress) {
      try {
        trace({
          name: TraceName.Card,
          op: TraceOperation.CardGetSupportedTokensAllowances,
        });
        const supportedTokensAllowances =
          await sdk.getSupportedTokensAllowances(selectedAddress);

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
          'useGetAllowances::Failed to fetch token allowances',
        );
        throw new Error('Failed to fetch token allowances');
      }
    }
  }, [sdk, selectedAddress, chainId]);

  return { fetchAllowances };
};
