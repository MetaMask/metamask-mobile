import { isSolanaChainId } from '@metamask/bridge-controller';
import { CaipChainId } from '@metamask/utils';

export const buildTokenIconUrl = (
  caipChainId?: CaipChainId,
  address?: string,
): string => {
  if (!caipChainId || !address) {
    return '';
  }

  const isSolana = isSolanaChainId(caipChainId);
  const networkPrefix = isSolana ? 'solana' : 'eip155';
  const tokenTypePrefix = isSolana ? 'token' : 'erc20';
  const chainId = isSolana
    ? caipChainId.replace('solana:', '')
    : caipChainId.split(':')[1];
  const tokenAddress = isSolana ? address : address.toLowerCase();

  return `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${networkPrefix}/${chainId}/${tokenTypePrefix}/${tokenAddress}.png`;
};
