import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { selectTokenMarketData } from '../../../../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../../../selectors/currencyRateController';
import { selectMultichainAssetsRates } from '../../../../../../../selectors/multichain/multichain';
import {
  calcTokenFiatRate,
  getTokenExchangeRate,
} from '../../../../../../UI/Bridge/utils/exchange-rates';
import { useDestTokenExchangeRate } from './useDestTokenExchangeRate';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(),
}));

jest.mock('../../../../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(),
  selectCurrentCurrency: jest.fn(),
}));

jest.mock('../../../../../../../selectors/multichain/multichain', () => ({
  selectMultichainAssetsRates: jest.fn(),
}));

jest.mock('../../../../../../UI/Bridge/utils/exchange-rates', () => ({
  calcTokenFiatRate: jest.fn(),
  getTokenExchangeRate: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockCalcTokenFiatRate = calcTokenFiatRate as jest.Mock;
const mockGetTokenExchangeRate = getTokenExchangeRate as jest.Mock;

const STATE = {
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurationsByChainId: { '0x1': { nativeCurrency: 'ETH' } },
      },
    },
  },
} as never;

const evmToken = (
  address = '0x6b175474e89094c44da98b954eedeac495271d0f',
): BridgeToken =>
  ({
    address,
    chainId: '0x1',
    symbol: 'DAI',
    name: 'Dai',
    decimals: 18,
  }) as BridgeToken;

describe('useDestTokenExchangeRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector: (s: unknown) => unknown) =>
      selector(STATE),
    );
    (selectTokenMarketData as unknown as jest.Mock).mockReturnValue({});
    (selectCurrencyRates as unknown as jest.Mock).mockReturnValue({});
    (selectMultichainAssetsRates as unknown as jest.Mock).mockReturnValue({});
    (selectCurrentCurrency as unknown as jest.Mock).mockReturnValue('usd');
    mockGetTokenExchangeRate.mockResolvedValue(undefined);
  });

  it('returns undefined when the token is missing', () => {
    const { result } = renderHook(() => useDestTokenExchangeRate(undefined));
    expect(result.current).toBeUndefined();
    expect(mockCalcTokenFiatRate).not.toHaveBeenCalled();
  });

  it('returns the resolved rate when a positive price is available', () => {
    mockCalcTokenFiatRate.mockReturnValue(1.23);
    const { result } = renderHook(() => useDestTokenExchangeRate(evmToken()));
    expect(result.current).toBe(1.23);
  });

  it('checksums the EVM address before pricing (matches market-data keys)', () => {
    mockCalcTokenFiatRate.mockReturnValue(1);
    renderHook(() =>
      useDestTokenExchangeRate(
        evmToken('0x6b175474e89094c44da98b954eedeac495271d0f'),
      ),
    );
    expect(mockCalcTokenFiatRate).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.objectContaining({
          address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        }),
      }),
    );
  });

  it('returns undefined when no price resolves', () => {
    mockCalcTokenFiatRate.mockReturnValue(undefined);
    const { result } = renderHook(() => useDestTokenExchangeRate(evmToken()));
    expect(result.current).toBeUndefined();
  });

  it('returns undefined for a non-positive rate', () => {
    mockCalcTokenFiatRate.mockReturnValue(0);
    const { result } = renderHook(() => useDestTokenExchangeRate(evmToken()));
    expect(result.current).toBeUndefined();
  });

  it('fetches the price when no cached rate exists for the token', async () => {
    mockCalcTokenFiatRate.mockReturnValue(undefined);
    mockGetTokenExchangeRate.mockResolvedValue(0.42);

    const { result } = renderHook(() => useDestTokenExchangeRate(evmToken()));

    await waitFor(() => expect(result.current).toBe(0.42));
    expect(mockGetTokenExchangeRate).toHaveBeenCalledWith({
      chainId: '0x1',
      tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
      currency: 'usd',
    });
  });

  it('skips the fetch when a cached rate is already available', () => {
    mockCalcTokenFiatRate.mockReturnValue(1.23);
    renderHook(() => useDestTokenExchangeRate(evmToken()));
    expect(mockGetTokenExchangeRate).not.toHaveBeenCalled();
  });

  it('ignores a fetched price that is not a positive number', async () => {
    mockCalcTokenFiatRate.mockReturnValue(undefined);
    mockGetTokenExchangeRate.mockResolvedValue(0);

    const { result } = renderHook(() => useDestTokenExchangeRate(evmToken()));

    await waitFor(() => expect(mockGetTokenExchangeRate).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });

  it('does not surface a fetched price against a different token', async () => {
    mockCalcTokenFiatRate.mockReturnValue(undefined);
    mockGetTokenExchangeRate.mockResolvedValue(0.42);

    const { result, rerender } = renderHook(
      (token: BridgeToken | undefined) => useDestTokenExchangeRate(token),
      { initialProps: evmToken() },
    );
    await waitFor(() => expect(result.current).toBe(0.42));

    mockGetTokenExchangeRate.mockResolvedValue(undefined);
    rerender(evmToken('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'));

    await waitFor(() => expect(result.current).toBeUndefined());
  });
});
