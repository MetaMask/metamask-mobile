import { renderHook } from '@testing-library/react-native';
import { CaipChainId, Hex } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';

import { BridgeToken } from '../../types';
import { isRwaChecked } from '../../../../hooks/useTokensData/useTokensData';
import { selectBatchSellDestStablecoinsByChain } from '../../../../../core/redux/slices/bridge';
import { useTokensWithBalance } from '../../hooks/useTokensWithBalance';
import { useBatchSellTokens } from './useBatchSellTokens';
import {
  SUPPORTED_BATCH_SELL_CHAIN_IDS,
  BatchSellTokenSortDirection,
} from './BatchSellTokenSelect.utils';

const mockUseSelector = jest.fn();
const mockUseTokensWithBalance = useTokensWithBalance as jest.Mock;
const mockIsRwaChecked = isRwaChecked as jest.Mock;

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    mockUseSelector(selector),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectBatchSellDestStablecoinsByChain: jest.fn(),
}));

jest.mock('../../hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: jest.fn(),
}));

jest.mock('../../../../hooks/useTokensData/useTokensData', () => ({
  isRwaChecked: jest.fn(),
}));

const createToken = (overrides: Partial<BridgeToken>): BridgeToken => ({
  address: '0x1111111111111111111111111111111111111111',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'TST',
  name: 'Test Token',
  balance: '1',
  balanceFiat: '$1.00',
  tokenFiatAmount: 1,
  ...overrides,
});

function renderUseBatchSellTokens(
  sortDirection: BatchSellTokenSortDirection = 'desc',
) {
  return renderHook(() => useBatchSellTokens(sortDirection));
}

describe('useBatchSellTokens', () => {
  let stablecoinsByChain: Partial<Record<CaipChainId, BridgeToken[]>>;

  beforeEach(() => {
    jest.clearAllMocks();
    stablecoinsByChain = {};
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectBatchSellDestStablecoinsByChain) {
        return stablecoinsByChain;
      }
      return undefined;
    });
    mockUseTokensWithBalance.mockReturnValue({
      tokens: [],
      isRwaDataLoading: false,
    });
    mockIsRwaChecked.mockReturnValue(true);
  });

  it('opts into fetching token data for supported batch sell chains', () => {
    renderUseBatchSellTokens();

    expect(mockUseTokensWithBalance).toHaveBeenCalledWith(
      {
        chainIds: SUPPORTED_BATCH_SELL_CHAIN_IDS,
      },
      { shouldFetchTokenData: true },
    );
  });

  it('filters destination stablecoins and RWA tokens, then sorts by descending fiat balance', () => {
    const stablecoin = createToken({
      symbol: 'USDC',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      tokenFiatAmount: 100,
    });
    const stockRwa = createToken({
      symbol: 'AAPL',
      address: '0x2222222222222222222222222222222222222222',
      tokenFiatAmount: 50,
      rwaData: { instrumentType: 'stock' } as BridgeToken['rwaData'],
    });
    const lowValueToken = createToken({
      symbol: 'LOW',
      address: '0x3333333333333333333333333333333333333333',
      tokenFiatAmount: 10,
    });
    const highValueToken = createToken({
      symbol: 'HIGH',
      address: '0x4444444444444444444444444444444444444444',
      tokenFiatAmount: 25,
    });

    stablecoinsByChain = {
      [formatChainIdToCaip(stablecoin.chainId)]: [stablecoin],
    };
    mockUseTokensWithBalance.mockReturnValue({
      tokens: [stablecoin, stockRwa, lowValueToken, highValueToken],
      isRwaDataLoading: false,
    });

    const { result } = renderUseBatchSellTokens();

    expect(
      result.current.eligibleSourceTokens.map((token) => token.symbol),
    ).toEqual(['HIGH', 'LOW']);
  });

  it('excludes tokens whose RWA status has not been checked', () => {
    const checkedToken = createToken({
      symbol: 'CHECKED',
      address: '0x1111111111111111111111111111111111111111',
      tokenFiatAmount: 25,
    });
    const uncheckedToken = createToken({
      symbol: 'UNKNOWN',
      address: '0x2222222222222222222222222222222222222222',
      tokenFiatAmount: 50,
    });
    mockIsRwaChecked.mockImplementation(
      (assetId: string) => !assetId.includes(uncheckedToken.address),
    );
    mockUseTokensWithBalance.mockReturnValue({
      tokens: [checkedToken, uncheckedToken],
      isRwaDataLoading: false,
    });

    const { result } = renderUseBatchSellTokens();

    expect(
      result.current.eligibleSourceTokens.map((token) => token.symbol),
    ).toEqual(['CHECKED']);
  });

  it('sorts eligible tokens by ascending fiat balance when requested', () => {
    mockUseTokensWithBalance.mockReturnValue({
      tokens: [
        createToken({
          symbol: 'HIGH',
          address: '0x4444444444444444444444444444444444444444',
          tokenFiatAmount: 25,
        }),
        createToken({
          symbol: 'LOW',
          address: '0x3333333333333333333333333333333333333333',
          tokenFiatAmount: 10,
        }),
      ],
      isRwaDataLoading: false,
    });

    const { result } = renderUseBatchSellTokens('asc');

    expect(
      result.current.eligibleSourceTokens.map((token) => token.symbol),
    ).toEqual(['LOW', 'HIGH']);
  });

  it('builds eligible chains from filtered source tokens', () => {
    mockUseTokensWithBalance.mockReturnValue({
      tokens: [
        createToken({
          symbol: 'ETHA',
          address: '0x1111111111111111111111111111111111111111',
          chainId: '0x1' as Hex,
          tokenFiatAmount: 10,
        }),
        createToken({
          symbol: 'BSCA',
          address: '0x2222222222222222222222222222222222222222',
          chainId: '0x38' as Hex,
          tokenFiatAmount: 25,
        }),
      ],
      isRwaDataLoading: false,
    });

    const { result } = renderUseBatchSellTokens();

    expect(
      result.current.sortedEligibleChains.map((chain) => chain.chainId),
    ).toEqual(['eip155:56', 'eip155:1']);
  });

  it('passes through the RWA data loading state', () => {
    mockUseTokensWithBalance.mockReturnValue({
      tokens: [createToken({ symbol: 'ETHA' })],
      isRwaDataLoading: true,
    });

    const { result } = renderUseBatchSellTokens();

    expect(result.current.isRwaDataLoading).toBe(true);
  });
});
