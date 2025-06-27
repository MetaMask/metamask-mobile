import { useFetchTokenRatesMulti } from './useTokenRates';
import { DepositCryptoCurrency, DepositFiatCurrency } from '../constants';

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

const useDepsositTokenExchange = ({
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

  const tokenAmount = rate
    ? (parseFloat(fiatAmount || '0') * rate).toFixed(token.decimals)
    : '0';

  return {
    tokenAmount,
    rate,
    isLoading,
    error,
  };
};

export default useDepsositTokenExchange;
