import { Hex } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { usePriceInUsd } from './usePriceInUsd';
import {
  selectCurrencyRateForChainId,
  selectUSDConversionRateByChainId,
} from '../../../../../selectors/currencyRateController';

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrencyRateForChainId: jest.fn(),
  selectUSDConversionRateByChainId: jest.fn(),
}));

const mockSelectCurrencyRateForChainId = jest.mocked(
  selectCurrencyRateForChainId,
);
const mockSelectUSDConversionRateByChainId = jest.mocked(
  selectUSDConversionRateByChainId,
);

const CHAIN_ID = '0x1' as Hex;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('usePriceInUsd', () => {
  it('returns the price converted to USD', () => {
    // ETH/EUR = 2800, ETH/USD = 3000 → USD price = 100 * (3000 / 2800) ≈ 107.14
    mockSelectCurrencyRateForChainId.mockReturnValue(2800);
    mockSelectUSDConversionRateByChainId.mockReturnValue(3000);

    const { result } = renderHookWithProvider(() =>
      usePriceInUsd(CHAIN_ID, 100),
    );

    expect(result.current).toBeCloseTo(107.14, 1);
  });

  it('returns the same price when user currency is already USD', () => {
    // When fiatRate === usdRate the formula is an identity
    mockSelectCurrencyRateForChainId.mockReturnValue(3000);
    mockSelectUSDConversionRateByChainId.mockReturnValue(3000);

    const { result } = renderHookWithProvider(() =>
      usePriceInUsd(CHAIN_ID, 250),
    );

    expect(result.current).toBeCloseTo(250, 5);
  });

  it('returns null when chainId is null', () => {
    mockSelectCurrencyRateForChainId.mockReturnValue(3000);
    mockSelectUSDConversionRateByChainId.mockReturnValue(3000);

    const { result } = renderHookWithProvider(() => usePriceInUsd(null, 100));

    expect(result.current).toBeNull();
  });

  it('returns null when chainId is undefined', () => {
    mockSelectCurrencyRateForChainId.mockReturnValue(3000);
    mockSelectUSDConversionRateByChainId.mockReturnValue(3000);

    const { result } = renderHookWithProvider(() =>
      usePriceInUsd(undefined, 100),
    );

    expect(result.current).toBeNull();
  });

  it('returns null when fiatRate is 0 (e.g. testnet with fiat disabled)', () => {
    mockSelectCurrencyRateForChainId.mockReturnValue(0);
    mockSelectUSDConversionRateByChainId.mockReturnValue(3000);

    const { result } = renderHookWithProvider(() =>
      usePriceInUsd(CHAIN_ID, 100),
    );

    expect(result.current).toBeNull();
  });

  it('returns null when usdRate is undefined (network config missing)', () => {
    mockSelectCurrencyRateForChainId.mockReturnValue(3000);
    mockSelectUSDConversionRateByChainId.mockReturnValue(undefined);

    const { result } = renderHookWithProvider(() =>
      usePriceInUsd(CHAIN_ID, 100),
    );

    expect(result.current).toBeNull();
  });

  it('returns null when priceInCurrentCurrency is NaN', () => {
    mockSelectCurrencyRateForChainId.mockReturnValue(3000);
    mockSelectUSDConversionRateByChainId.mockReturnValue(3000);

    const { result } = renderHookWithProvider(() =>
      usePriceInUsd(CHAIN_ID, NaN),
    );

    expect(result.current).toBeNull();
  });

  it('returns 0 when priceInCurrentCurrency is 0', () => {
    mockSelectCurrencyRateForChainId.mockReturnValue(3000);
    mockSelectUSDConversionRateByChainId.mockReturnValue(3000);

    const { result } = renderHookWithProvider(() => usePriceInUsd(CHAIN_ID, 0));

    expect(result.current).toBe(0);
  });
});
