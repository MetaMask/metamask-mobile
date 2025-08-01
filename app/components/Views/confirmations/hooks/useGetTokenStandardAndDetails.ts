import { NetworkClientId } from '@metamask/network-controller';
import { Hex } from '@metamask/utils';

import { TokenStandard } from '../../../UI/SimulationDetails/types';
import { useAsyncResult } from '../../../hooks/useAsyncResult';
import {
  ERC20_DEFAULT_DECIMALS,
  parseTokenDetailDecimals,
  memoizedGetTokenStandardAndDetails,
  TokenDetailsERC20,
} from '../utils/token';
import { useRef } from 'react';

/**
 * Returns token details for a given token contract
 *
 * @param tokenAddress
 * @returns
 */
export const useGetTokenStandardAndDetails = (
  tokenAddress?: Hex | string | undefined,
  networkClientId?: NetworkClientId,
) => {
  const isPendingRef = useRef<boolean>(false);

  const { value: details } =
    useAsyncResult<TokenDetailsERC20 | null>(async () => {
      if (!tokenAddress) {
        return Promise.resolve(null);
      }

      isPendingRef.current = true;

      const result = (await memoizedGetTokenStandardAndDetails({
        tokenAddress,
        networkClientId,
      })) as TokenDetailsERC20;
      isPendingRef.current = false;

      return result;
    }, [tokenAddress]);

  if (!details) {
    return {
      details: {
        decimalsNumber: undefined,
        standard: undefined,
        symbol: undefined,
      },
      isPending: isPendingRef.current,
    };
  }

  const { decimals, standard } = details || {};

  const finalDetails =
    standard === TokenStandard.ERC20
      ? {
          ...details,
          decimalsNumber:
            parseTokenDetailDecimals(decimals) ?? ERC20_DEFAULT_DECIMALS,
        }
      : details;

  return { details: finalDetails, isPending: isPendingRef.current };
};
