import Engine from '../../../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectTokensByChainIdAndAddress } from '../../../../../selectors/tokensController';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { Hex, createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('add-token');

export function useAddToken({
  chainId,
  decimals,
  name,
  symbol,
  tokenAddress,
}: {
  chainId: Hex;
  decimals: number;
  name: string;
  symbol: string;
  tokenAddress: Hex;
}) {
  const { NetworkController, TokensController } = Engine.context;

  const addedTokens = useSelector((state) =>
    selectTokensByChainIdAndAddress(state, chainId),
  );

  const hasToken = Object.values(addedTokens).some(
    (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
  );

  const { error } = useAsyncResult(async () => {
    if (hasToken) {
      return;
    }

    const networkClientId =
      NetworkController.findNetworkClientIdByChainId(chainId);

    await TokensController.addToken({
      address: tokenAddress,
      decimals,
      name,
      networkClientId,
      symbol,
    });

    log('Added token', { tokenAddress, chainId });
  }, [hasToken]);

  if (error) {
    log('Failed', { tokenAddress, chainId, error });
  }
}
