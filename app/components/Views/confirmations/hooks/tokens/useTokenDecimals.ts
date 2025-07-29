import { useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { selectTokensByAddressAndChain } from '../../../../../selectors/tokensController';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { Token } from '@metamask/assets-controllers';

export interface TokenDecimalRequest {
  chainId: Hex;
  address: Hex;
}

export function useTokenDecimals(requests: TokenDecimalRequest[]) {
  const tokens = useSelector((state: RootState) =>
    selectTokensByAddressAndChain(state, requests),
  );

  checkResult(requests, tokens);

  return useMemo(() => tokens.map((token) => token?.decimals), [tokens]);
}

function checkResult(
  requests: TokenDecimalRequest[],
  tokens: (Token | undefined)[],
): asserts tokens is Token[] {
  for (let index = 0; index < requests.length; index++) {
    const { address, chainId } = requests[index];
    const token = tokens[index];

    if (!token) {
      throw new Error(
        `Token not found with address: ${address} on chain: ${chainId}`,
      );
    }
  }
}
