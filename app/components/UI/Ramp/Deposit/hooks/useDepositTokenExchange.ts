import { useFetchTokenRatesMulti } from './useTokenRates';
import Logger from '../../../../../util/Logger';
import {
  DepositFiatCurrency,
  DepositCryptoCurrency,
} from '@consensys/native-ramps-sdk/dist/Deposit';

interface UseTokenExchangeParams {
  fiatCurrency: DepositFiatCurrency;
  fiatAmount: string;
  token: DepositCryptoCurrency;
  tokens: DepositCryptoCurrency[];
}

interface UseTokenExchangeResult {
  tokenAmount: string;
  rate: number | null;
  isLoading: boolean;
  error: Error | null;
}

const useDepositTokenExchange = ({
  fiatCurrency,
  fiatAmount,
  token,
  tokens,
}: UseTokenExchangeParams): UseTokenExchangeResult => {
  const { rates, isLoading, error } = useFetchTokenRatesMulti({
    tokens,
    fiatCurrency,
  });

  const currentToken = tokens.find(({ assetId }) => assetId === token.assetId);

  const rate = currentToken ? rates[currentToken.assetId] ?? null : null;

  let tokenAmount = '0';

  try {
    if (rate) {
      tokenAmount = (parseFloat(fiatAmount || '0') / rate).toFixed(
        token.decimals,
      );
    }
  } catch (e) {
    Logger.error(
      e as Error,
      `Error calculating token amount with fiat amount ${fiatAmount} and rate ${rate}`,
    );
  }

  return {
    tokenAmount,
    rate,
    isLoading,
    error,
  };
};

export default useDepositTokenExchange;
