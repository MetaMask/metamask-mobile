import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { toChecksumAddress } from '../../../../../../util/address';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import {
  getSellDestTokenCandidates,
  getSourceTokenCandidates,
} from './sourceTokenCandidates';
import {
  useSellDestTokenOptions,
  useSourceTokenOptions,
} from './hooks/useSourceTokenOptions';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./sourceTokenCandidates', () => ({
  getSourceTokenCandidates: jest.fn(),
  getSellDestTokenCandidates: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockGetSourceTokenCandidates =
  getSourceTokenCandidates as jest.MockedFunction<
    typeof getSourceTokenCandidates
  >;
const mockGetSellDestTokenCandidates =
  getSellDestTokenCandidates as jest.MockedFunction<
    typeof getSellDestTokenCandidates
  >;

const SOLANA_SCOPE = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const createCandidate = (
  overrides: Partial<BridgeToken> &
    Pick<BridgeToken, 'address' | 'chainId' | 'symbol'>,
): BridgeToken =>
  ({
    decimals: 18,
    name: 'Ethereum',
    ...overrides,
  }) as BridgeToken;

const toHexBalance = (value: bigint): string => `0x${value.toString(16)}`;

const mockSelectorValues = ({
  evmEnabledNetworks = ['0x1'],
  nonEvmEnabledNetworks = [SOLANA_SCOPE],
  accountAddress,
  accountsByChainId = {},
  tokenBalances = {},
  tokenMarketData = {},
  currencyRates = {},
  currentCurrency = 'usd',
  solanaAccount,
  multichainBalances = {},
  multichainRates = {},
  allNetworkConfigs = {},
}: {
  evmEnabledNetworks?: string[];
  nonEvmEnabledNetworks?: string[];
  accountAddress?: string;
  accountsByChainId?: Record<string, unknown>;
  tokenBalances?: Record<string, unknown>;
  tokenMarketData?: Record<string, unknown>;
  currencyRates?: Record<string, unknown>;
  currentCurrency?: string;
  solanaAccount?: { id: string; address: string };
  multichainBalances?: Record<string, unknown>;
  multichainRates?: Record<string, unknown>;
  allNetworkConfigs?: Record<string, unknown>;
}) => {
  // The first two selectors are read by `useNetworkEnabledPredicate`
  // (selectEVMEnabledNetworks, then selectNonEVMEnabledNetworks).
  mockUseSelector
    .mockReturnValueOnce(evmEnabledNetworks)
    .mockReturnValueOnce(nonEvmEnabledNetworks)
    .mockReturnValueOnce(accountAddress)
    .mockReturnValueOnce(accountsByChainId)
    .mockReturnValueOnce(tokenBalances)
    .mockReturnValueOnce(tokenMarketData)
    .mockReturnValueOnce(currencyRates)
    .mockReturnValueOnce(currentCurrency)
    .mockReturnValueOnce(solanaAccount)
    .mockReturnValueOnce(multichainBalances)
    .mockReturnValueOnce(multichainRates)
    .mockReturnValueOnce(allNetworkConfigs);
};

describe('useSourceTokenOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns no options when there is no selected account', () => {
    mockGetSourceTokenCandidates.mockReturnValue([
      createCandidate({ address: ZERO_ADDRESS, chainId: '0x1', symbol: 'ETH' }),
    ]);
    mockSelectorValues({});

    const { result } = renderHook(() => useSourceTokenOptions('0x89'));

    expect(result.current).toEqual({
      isLoading: false,
      options: [],
    });
    expect(mockGetSourceTokenCandidates).toHaveBeenCalledWith('0x89');
  });

  it('filters zero balances and sorts options by fiat value', () => {
    const accountAddress = '0x742d35cc6634c0532925a3b844bc454e4438f44e';
    const checksummedAccountAddress = toChecksumAddress(accountAddress);
    const usdcAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const checksummedUsdcAddress = toChecksumAddress(usdcAddress);
    const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';

    mockGetSourceTokenCandidates.mockReturnValue([
      createCandidate({
        address: ZERO_ADDRESS,
        chainId: '0x1',
        symbol: 'ETH',
        name: 'Ethereum',
      }),
      createCandidate({
        address: usdcAddress,
        chainId: '0x1',
        decimals: 6,
        symbol: 'USDC',
        name: 'USD Coin',
      }),
      createCandidate({
        address: daiAddress,
        chainId: '0x1',
        decimals: 18,
        symbol: 'DAI',
        name: 'Dai Stablecoin',
      }),
    ]);
    mockSelectorValues({
      accountAddress,
      accountsByChainId: {
        '0x1': {
          [checksummedAccountAddress]: {
            balance: toHexBalance(1n * 10n ** 18n),
          },
        },
      },
      tokenBalances: {
        [checksummedAccountAddress]: {
          '0x1': {
            [checksummedUsdcAddress]: toHexBalance(250n * 10n ** 6n),
            [daiAddress]: '0x0',
          },
        },
      },
      currencyRates: {
        ETH: { usdConversionRate: 2000 },
      },
      allNetworkConfigs: {
        '0x1': { nativeCurrency: 'ETH' },
      },
    });

    const { result } = renderHook(() => useSourceTokenOptions('0x1'));

    expect(result.current.options).toHaveLength(2);
    expect(result.current.options.map((token) => token.symbol)).toEqual([
      'ETH',
      'USDC',
    ]);
    expect(result.current.options[0]).toMatchObject({
      balance: '1.0',
      balanceFiat: '$2000.00',
      currencyExchangeRate: 2000,
      tokenFiatAmount: 2000,
    });
    expect(result.current.options[1]).toMatchObject({
      balance: '250.0',
      balanceFiat: '$250.00',
      currencyExchangeRate: 1,
      tokenFiatAmount: 250,
    });
  });

  it('includes a Solana SOL candidate sorted by fiat value', () => {
    const accountAddress = '0x742d35cc6634c0532925a3b844bc454e4438f44e';
    const checksummedAccountAddress = toChecksumAddress(accountAddress);
    const solAssetId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';
    const solanaScope = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    const solanaAccount = {
      id: 'solana-account-id',
      address: 'SoLanaWalletAddrBase58',
    };

    mockGetSourceTokenCandidates.mockReturnValue([
      createCandidate({
        address: ZERO_ADDRESS,
        chainId: '0x1',
        symbol: 'ETH',
        name: 'Ethereum',
      }),
      createCandidate({
        address: solAssetId,
        chainId: solanaScope,
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana',
      }),
    ]);
    mockSelectorValues({
      accountAddress,
      accountsByChainId: {
        '0x1': {
          [checksummedAccountAddress]: {
            balance: toHexBalance(1n * 10n ** 18n),
          },
        },
      },
      currencyRates: {
        ETH: { usdConversionRate: 2000 },
      },
      solanaAccount,
      multichainBalances: {
        [solanaAccount.id]: {
          [solAssetId]: { amount: '12.5', unit: 'SOL' },
        },
      },
      multichainRates: {
        [solAssetId]: { rate: '200' },
      },
      allNetworkConfigs: {
        '0x1': { nativeCurrency: 'ETH' },
      },
    });

    const { result } = renderHook(() => useSourceTokenOptions('0x1'));

    expect(result.current.options.map((token) => token.symbol)).toEqual([
      'SOL',
      'ETH',
    ]);
    expect(result.current.options[0]).toMatchObject({
      symbol: 'SOL',
      balance: '12.5',
      balanceFiat: '$2500.00',
      currencyExchangeRate: 200,
      tokenFiatAmount: 2500,
    });
  });

  it('skips Solana candidates when there is no Solana account', () => {
    const accountAddress = '0x742d35cc6634c0532925a3b844bc454e4438f44e';
    const checksummedAccountAddress = toChecksumAddress(accountAddress);
    const solAssetId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';
    const solanaScope = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

    mockGetSourceTokenCandidates.mockReturnValue([
      createCandidate({
        address: ZERO_ADDRESS,
        chainId: '0x1',
        symbol: 'ETH',
        name: 'Ethereum',
      }),
      createCandidate({
        address: solAssetId,
        chainId: solanaScope,
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana',
      }),
    ]);
    mockSelectorValues({
      accountAddress,
      accountsByChainId: {
        '0x1': {
          [checksummedAccountAddress]: {
            balance: toHexBalance(1n * 10n ** 18n),
          },
        },
      },
      currencyRates: {
        ETH: { usdConversionRate: 2000 },
      },
      // no solanaAccount provided
      allNetworkConfigs: {
        '0x1': { nativeCurrency: 'ETH' },
      },
    });

    const { result } = renderHook(() => useSourceTokenOptions('0x1'));

    expect(result.current.options.map((token) => token.symbol)).toEqual([
      'ETH',
    ]);
  });

  it('skips Solana candidates with zero balance', () => {
    const solAssetId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';
    const solanaScope = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    const solanaAccount = {
      id: 'solana-account-id',
      address: 'SoLanaWalletAddrBase58',
    };

    mockGetSourceTokenCandidates.mockReturnValue([
      createCandidate({
        address: solAssetId,
        chainId: solanaScope,
        decimals: 9,
        symbol: 'SOL',
        name: 'Solana',
      }),
    ]);
    mockSelectorValues({
      solanaAccount,
      multichainBalances: {
        [solanaAccount.id]: {
          [solAssetId]: { amount: '0', unit: 'SOL' },
        },
      },
      multichainRates: {
        [solAssetId]: { rate: '200' },
      },
    });

    const { result } = renderHook(() => useSourceTokenOptions('0x1'));

    expect(result.current.options).toEqual([]);
  });

  it('skips ERC20 candidates when the computed exchange rate is zero', () => {
    const accountAddress = '0x742d35cc6634c0532925a3b844bc454e4438f44e';
    const checksummedAccountAddress = toChecksumAddress(accountAddress);
    const usdcAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const checksummedUsdcAddress = toChecksumAddress(usdcAddress);

    mockGetSourceTokenCandidates.mockReturnValue([
      createCandidate({
        address: usdcAddress,
        chainId: '0x1',
        decimals: 6,
        symbol: 'USDC',
        name: 'USD Coin',
      }),
    ]);
    mockSelectorValues({
      accountAddress,
      tokenBalances: {
        [checksummedAccountAddress]: {
          '0x1': {
            [checksummedUsdcAddress]: toHexBalance(250n * 10n ** 6n),
          },
        },
      },
      tokenMarketData: {
        '0x1': {
          [checksummedUsdcAddress]: {
            price: 0,
          },
        },
      },
      currencyRates: {
        ETH: { usdConversionRate: 2000 },
      },
      allNetworkConfigs: {
        '0x1': { nativeCurrency: 'ETH' },
      },
    });

    const { result } = renderHook(() => useSourceTokenOptions('0x1'));

    expect(result.current).toEqual({
      isLoading: false,
      options: [],
    });
  });

  it('excludes candidates on networks the user has not enabled', () => {
    const accountAddress = '0x742d35cc6634c0532925a3b844bc454e4438f44e';
    const checksummedAccountAddress = toChecksumAddress(accountAddress);

    mockGetSourceTokenCandidates.mockReturnValue([
      createCandidate({
        address: ZERO_ADDRESS,
        chainId: '0x1',
        symbol: 'ETH',
        name: 'Ethereum',
      }),
      // HyperEVM (0x3e7) — has a balance but the user hasn't enabled it.
      createCandidate({
        address: ZERO_ADDRESS,
        chainId: '0x3e7',
        symbol: 'HYPE',
        name: 'HyperEVM',
      }),
    ]);
    mockSelectorValues({
      evmEnabledNetworks: ['0x1'],
      accountAddress,
      accountsByChainId: {
        '0x1': {
          [checksummedAccountAddress]: {
            balance: toHexBalance(1n * 10n ** 18n),
          },
        },
        '0x3e7': {
          [checksummedAccountAddress]: {
            balance: toHexBalance(1n * 10n ** 18n),
          },
        },
      },
      currencyRates: {
        ETH: { usdConversionRate: 2000 },
        HYPE: { usdConversionRate: 5 },
      },
      allNetworkConfigs: {
        '0x1': { nativeCurrency: 'ETH' },
        '0x3e7': { nativeCurrency: 'HYPE' },
      },
    });

    const { result } = renderHook(() => useSourceTokenOptions('0x1'));

    expect(result.current.options.map((token) => token.symbol)).toEqual([
      'ETH',
    ]);
  });
});

describe('useSellDestTokenOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // `useSellDestTokenOptions` reads selectors in a fixed order; the first two
  // are the enabled-network selectors consumed by `useNetworkEnabledPredicate`.
  const mockSellDestSelectors = (evmEnabledNetworks: string[]) => {
    mockUseSelector
      .mockReturnValueOnce(evmEnabledNetworks)
      .mockReturnValueOnce([])
      .mockReturnValueOnce('0x742d35cc6634c0532925a3b844bc454e4438f44e')
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValueOnce('usd')
      .mockReturnValueOnce({});
  };

  it('excludes stable candidates on networks the user has not enabled', () => {
    mockGetSellDestTokenCandidates.mockReturnValue([
      createCandidate({
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1',
        decimals: 6,
        symbol: 'USDC',
        name: 'USD Coin',
      }),
      createCandidate({
        address: '0xb0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x3e7',
        decimals: 6,
        symbol: 'USDC',
        name: 'USD Coin',
      }),
    ]);
    mockSellDestSelectors(['0x1']);

    const { result } = renderHook(() => useSellDestTokenOptions('0x1'));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].chainId).toBe('0x1');
  });
});
