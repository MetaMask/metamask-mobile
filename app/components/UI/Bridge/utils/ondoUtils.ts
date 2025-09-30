import { BridgeToken } from '../types';

const ondoTradingApiUrl = process.env.ONDOP_TRADING_API_URL || '';
const ondoApiKey = process.env.ONDOP_API_KEY || '';

export const isTokenInWorkingHours = async (token: BridgeToken) => {
  const response = await fetch(
    `${ondoTradingApiUrl}?symbol=${token.symbol}&side=sell`,
    {
      headers: {
        'X-API-KEY': ondoApiKey,
      },
    },
  );
  const data = await response.json();
  return data.isAssetTradingOpen;
};
