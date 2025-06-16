import { useTokenRatesMulti } from './useTokenRates';
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
  const { rates, isLoading, error } = useTokenRatesMulti({
    tokens,
    fiatCurrency,
  });

  const currentToken = tokens.find(
    (_token) => _token.assetId === token.assetId,
  );

  const rate = currentToken ? rates[currentToken.symbol] ?? null : null;

  const tokenAmount = rate
    ? (parseFloat(fiatAmount || '0') * rate).toFixed(token.decimals)
    : '0'.padEnd(token.decimals + 2, '0');

  return {
    tokenAmount,
    rate,
    isLoading,
    error,
  };
};

export default useDepsositTokenExchange;
