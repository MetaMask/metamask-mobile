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

/**
 * Returns token details for a given token contract
 *
 * @param tokenAddress
 * @returns
 */
const useGetTokenStandardAndDetails = (
  tokenAddress?: Hex | string | undefined,
  networkClientId?: NetworkClientId,
) => {
  const { value: details } =
    useAsyncResult<TokenDetailsERC20 | null>(async () => {
      if (!tokenAddress) {
        return Promise.resolve(null);
      }

      return (await memoizedGetTokenStandardAndDetails({
        tokenAddress,
        networkClientId,
      })) as TokenDetailsERC20;
    }, [tokenAddress]);

  if (!details) {
    return { decimalsNumber: undefined };
  }

  const { decimals, standard } = details || {};

  if (standard === TokenStandard.ERC20) {
    const parsedDecimals =
      parseTokenDetailDecimals(decimals) ?? ERC20_DEFAULT_DECIMALS;
    details.decimalsNumber = parsedDecimals;
  }

  return details;
};

export default useGetTokenStandardAndDetails;
