import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { toChecksumAddress } from '../../../../../../util/address';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import { getSourceTokenCandidates } from './sourceTokenCandidates';
import { useSourceTokenOptions } from './useSourceTokenOptions';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./sourceTokenCandidates', () => ({
  getSourceTokenCandidates: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockGetSourceTokenCandidates =
  getSourceTokenCandidates as jest.MockedFunction<
    typeof getSourceTokenCandidates
  >;

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
  accountAddress,
  accountsByChainId = {},
  tokenBalances = {},
  tokenMarketData = {},
  currencyRates = {},
  allNetworkConfigs = {},
}: {
  accountAddress?: string;
  accountsByChainId?: Record<string, unknown>;
  tokenBalances?: Record<string, unknown>;
  tokenMarketData?: Record<string, unknown>;
  currencyRates?: Record<string, unknown>;
  allNetworkConfigs?: Record<string, unknown>;
}) => {
  mockUseSelector
    .mockReturnValueOnce(accountAddress)
    .mockReturnValueOnce(accountsByChainId)
    .mockReturnValueOnce(tokenBalances)
    .mockReturnValueOnce(tokenMarketData)
    .mockReturnValueOnce(currencyRates)
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
        ETH: { conversionRate: 2000 },
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
});
