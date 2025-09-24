import { useFetchTokenRatesMulti } from './useTokenRates';
import Logger from '../../../../../util/Logger';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';

interface UseTokenExchangeParams {
  fiatCurrency: string | null;
  fiatAmount: string;
  token: DepositCryptoCurrency | null;
  tokens: DepositCryptoCurrency[] | null;
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

  if (!tokens || !token) {
    return {
      tokenAmount: '0',
      rate: null,
      isLoading,
      error,
    };
  }

  const currentToken = tokens.find(({ assetId }) => assetId === token?.assetId);

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
