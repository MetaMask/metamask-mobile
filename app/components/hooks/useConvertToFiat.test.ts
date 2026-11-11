import { renderHook } from '@testing-library/react-native';
import { SolScope } from '@metamask/keyring-api';
import { useSelector } from 'react-redux';
import { useConvertToFiat } from './useConvertToFiat';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../selectors/currencyRateController', () => ({
  selectConversionRateByChainId: jest.fn((state) => state.conversionRate),
  selectUSDConversionRateByChainId: jest.fn((state) => state.usdConversionRate),
}));

jest.mock('../../selectors/tokenRatesController', () => ({
  selectContractExchangeRatesByChainId: jest.fn(
    (state) => state.contractExchangeRates,
  ),
}));

jest.mock('../../selectors/multichain', () => ({
  selectMultichainAssetsRates: jest.fn((state) => state.multichainAssetRates),
}));

const solChainId = SolScope.Mainnet;
const solAssetId = `${solChainId}/slip44:501`;
const usdcAssetId = `${solChainId}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`;

function mockUseSelectorState(state: Record<string, unknown>) {
  jest.mocked(useSelector).mockImplementation((selector) => selector(state));
}

describe('useConvertToFiat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('converts a Solana send using the multichain asset rate', () => {
    mockUseSelectorState({
      conversionRate: undefined,
      usdConversionRate: undefined,
      contractExchangeRates: {},
      multichainAssetRates: {
        [usdcAssetId]: { rate: '1' },
      },
    });

    const { result } = renderHook(() => useConvertToFiat(solChainId));

    expect(
      result.current({
        amount: '524800',
        decimals: 6,
        symbol: 'USDC',
        assetId: usdcAssetId,
        direction: 'out',
      }),
    ).toBe(0.5248);
  });

  it('converts a Solana native using the multichain asset rate', () => {
    mockUseSelectorState({
      conversionRate: undefined,
      usdConversionRate: undefined,
      contractExchangeRates: {},
      multichainAssetRates: {
        [solAssetId]: { rate: '150' },
      },
    });

    const { result } = renderHook(() => useConvertToFiat(solChainId));

    expect(
      result.current({
        amount: '5000000',
        decimals: 9,
        symbol: 'SOL',
        assetId: solAssetId,
        direction: 'out',
      }),
    ).toBe(0.75);
  });

  it('returns undefined when no rate is available', () => {
    mockUseSelectorState({
      conversionRate: undefined,
      usdConversionRate: undefined,
      contractExchangeRates: {},
      multichainAssetRates: {},
    });

    const { result } = renderHook(() => useConvertToFiat(solChainId));

    expect(
      result.current({
        amount: '524800',
        decimals: 6,
        symbol: 'USDC',
        assetId: usdcAssetId,
        direction: 'out',
      }),
    ).toBeUndefined();
  });
});
