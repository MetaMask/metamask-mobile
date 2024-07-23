import { getAmount, getUsdAmount } from '../notification.util';

export function getTokenAmount(token: {
  amount: string;
  decimals: string;
  symbol: string;
}) {
  return `${getAmount(token.amount, token.decimals, {
    shouldEllipse: true,
  })} ${token.symbol}`;
}

export function getTokenUSDAmount(token: {
  amount: string;
  decimals: string;
  usd: string;
}) {
  return `$${getUsdAmount(token.amount, token.decimals, token.usd)}`;
}
