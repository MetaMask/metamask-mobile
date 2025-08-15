import AppConstants from '../../../core/AppConstants';

export function getTokenAvatarUrl(token: {
  address: string;
  symbol: string;
  iconUrl: string;
}) {
  return token.address === AppConstants.ZERO_ADDRESS && token.symbol === 'ETH'
    ? 'https://raw.githubusercontent.com/MetaMask/metamask-mobile/main/app/images/eth-logo-new.png'
    : token.iconUrl;
}
