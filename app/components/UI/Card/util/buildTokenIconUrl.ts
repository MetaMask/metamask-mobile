import { isSolanaChainId } from '@metamask/bridge-controller';
import { CaipChainId } from '@metamask/utils';
import { CARD_TOKEN_ICON_OVERRIDES } from '../constants';

export const buildTokenIconUrl = (
  caipChainId?: CaipChainId,
  address?: string,
): string => {
  if (!caipChainId || !address) {
    return '';
  }

  const override =
    CARD_TOKEN_ICON_OVERRIDES[`${caipChainId}:${address.toLowerCase()}`];
  if (override) {
    return override;
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
