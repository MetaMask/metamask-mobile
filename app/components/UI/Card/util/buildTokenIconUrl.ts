import { isSolanaChainId } from '@metamask/bridge-controller';
import { hexToDecimal } from '../../../../util/conversions';

export const buildTokenIconUrl = (
  rawChainId?: string,
  address?: string,
): string => {
  if (!rawChainId || !address) {
    return '';
  }

  const isSolana = isSolanaChainId(rawChainId);
  const networkPrefix = isSolana ? 'solana' : 'eip155';
  const tokenTypePrefix = isSolana ? 'token' : 'erc20';
  const chainId = isSolana
    ? rawChainId.replace('solana:', '')
    : hexToDecimal(rawChainId);
  const tokenAddress = isSolana ? address : address.toLowerCase();

  return `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${networkPrefix}/${chainId}/${tokenTypePrefix}/${tokenAddress}.png`;
};
