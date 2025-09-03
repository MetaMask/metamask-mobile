import { hexToDecimal } from '../../../../util/conversions';

export const buildTokenIconUrl = (
  chainId?: string,
  address?: string,
): string => {
  if (!chainId || !address) {
    return '';
  }

  const chainIdDecimal = chainId.includes('0x')
    ? hexToDecimal(chainId)
    : chainId;
  return `https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/${chainIdDecimal}/erc20/${address.toLowerCase()}.png`;
};
