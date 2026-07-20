import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { selectTokenMarketData } from '../../../../../../../selectors/tokenRatesController';
import { selectCurrencyRates } from '../../../../../../../selectors/currencyRateController';
import { selectMultichainAssetsRates } from '../../../../../../../selectors/multichain/multichain';
import { calcTokenFiatRate } from '../../../../../../UI/Bridge/utils/exchange-rates';
import { useDestTokenExchangeRate } from './useDestTokenExchangeRate';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(),
}));

jest.mock('../../../../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(),
}));

jest.mock('../../../../../../../selectors/multichain/multichain', () => ({
  selectMultichainAssetsRates: jest.fn(),
}));

jest.mock('../../../../../../UI/Bridge/utils/exchange-rates', () => ({
  calcTokenFiatRate: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockCalcTokenFiatRate = calcTokenFiatRate as jest.Mock;

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
});
