import { renderHook } from '@testing-library/react-hooks';

import { useSendTokens } from './useSendTokens';
import { useAccountTokens } from './useAccountTokens';
import { useSendType } from './useSendType';
import { AssetType, TokenStandard } from '../../types/token';

jest.mock('./useAccountTokens');
jest.mock('./useSendType');

const mockUseAccountTokens = jest.mocked(useAccountTokens);
const mockUseSendType = jest.mocked(useSendType);

const mockEvmToken = {
  address: '0x1234567890123456789012345678901234567890',
  chainId: '0x1',
  symbol: 'ETH',
  ticker: 'ETH',
  decimals: 18,
  balance: '1.5',
  balanceFiat: '$3000.00',
  image: 'https://example.com/eth.png',
  aggregators: [],
  logo: 'https://example.com/eth.png',
  isETH: true,
  isNative: true,
  accountType: 'eip155:1/erc20:0xtoken1',
  networkBadgeSource: 'network-badge-source',
  balanceInSelectedCurrency: '$3000.00',
  standard: TokenStandard.ERC20,
  fiat: { balance: '3000' },
  rawBalance: '0x1234',
} as unknown as AssetType;

const mockSolanaToken: AssetType = {
  address: '0xsolanatoken',
  chainId: 'solana:mainnet',
  symbol: 'SOL',
  ticker: 'SOL',
  decimals: 9,
  balance: '10.5',
  balanceFiat: '$500.00',
  image: 'https://example.com/sol.png',
  aggregators: [],
  logo: 'https://example.com/sol.png',
  isNative: true,
  accountType: 'solana:mainnet/spl:0xsoltoken1',
  networkBadgeSource: 'network-badge-source',
  balanceInSelectedCurrency: '$500.00',
  standard: TokenStandard.ERC20,
  fiat: { balance: '500' },
  rawBalance: '0x5678',
} as unknown as AssetType;

const mockTronToken: AssetType = {
  address: '0xtrontoken',
  chainId: 'tron:mainnet',
  symbol: 'TRX',
  ticker: 'TRX',
  decimals: 6,
  balance: '100',
  balanceFiat: '$200.00',
  image: 'https://example.com/trx.png',
  aggregators: [],
  logo: 'https://example.com/trx.png',
  isNative: true,
  accountType: 'tron:mainnet/trc20:0xtrontoken1',
  networkBadgeSource: 'network-badge-source',
  balanceInSelectedCurrency: '$200.00',
  standard: TokenStandard.ERC20,
  fiat: { balance: '200' },
  rawBalance: '0x9abc',
} as unknown as AssetType;

const mockBitcoinToken: AssetType = {
  address: '0xbtctoken',
  chainId: 'bip122:000000000019d6689c085ae165831e93',
  symbol: 'BTC',
  ticker: 'BTC',
  decimals: 8,
  balance: '0.5',
  balanceFiat: '$25000.00',
  image: 'https://example.com/btc.png',
  aggregators: [],
  logo: 'https://example.com/btc.png',
  isNative: true,
  accountType: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  networkBadgeSource: 'network-badge-source',
  balanceInSelectedCurrency: '$25000.00',
  standard: TokenStandard.ERC20,
  fiat: { balance: '25000' },
  rawBalance: '0xdef0',
} as unknown as AssetType;

describe('useSendTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSendType.mockReturnValue({
      isEvmSendType: undefined,
      isEvmNativeSendType: undefined,
      isNonEvmSendType: undefined,
      isNonEvmNativeSendType: undefined,
      isSolanaSendType: undefined,
      isBitcoinSendType: undefined,
      isTronSendType: undefined,
    });
  });

  it('returns all tokens when no send type is set', () => {
    mockUseAccountTokens.mockReturnValue([
      mockEvmToken,
      mockSolanaToken,
      mockTronToken,
      mockBitcoinToken,
    ]);

    const { result } = renderHook(() => useSendTokens());

    expect(mockUseAccountTokens).toHaveBeenCalledWith({
      includeNoBalance: false,
    });
    expect(result.current).toHaveLength(4);
  });

  it('filters to EVM tokens when isEvmSendType is true', () => {
    mockUseSendType.mockReturnValue({
      isEvmSendType: true,
      isEvmNativeSendType: undefined,
      isNonEvmSendType: undefined,
      isNonEvmNativeSendType: undefined,
      isSolanaSendType: undefined,
      isBitcoinSendType: undefined,
      isTronSendType: undefined,
    });
    mockUseAccountTokens.mockReturnValue([
      mockEvmToken,
      mockSolanaToken,
      mockTronToken,
      mockBitcoinToken,
    ]);

    const { result } = renderHook(() => useSendTokens());

    expect(mockUseAccountTokens).toHaveBeenCalledWith({
      includeNoBalance: false,
    });
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual(mockEvmToken);
  });

  it('filters to Solana tokens when isSolanaSendType is true', () => {
    mockUseSendType.mockReturnValue({
      isEvmSendType: undefined,
      isEvmNativeSendType: undefined,
      isNonEvmSendType: true,
      isNonEvmNativeSendType: undefined,
      isSolanaSendType: true,
      isBitcoinSendType: undefined,
      isTronSendType: undefined,
    });
    mockUseAccountTokens.mockReturnValue([
      mockEvmToken,
      mockSolanaToken,
      mockTronToken,
      mockBitcoinToken,
    ]);

    const { result } = renderHook(() => useSendTokens());

    expect(mockUseAccountTokens).toHaveBeenCalledWith({
      includeNoBalance: false,
    });
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual(mockSolanaToken);
  });

  it('filters to Tron tokens when isTronSendType is true', () => {
    mockUseSendType.mockReturnValue({
      isEvmSendType: undefined,
      isEvmNativeSendType: undefined,
      isNonEvmSendType: true,
      isNonEvmNativeSendType: undefined,
      isSolanaSendType: undefined,
      isBitcoinSendType: undefined,
      isTronSendType: true,
    });
    mockUseAccountTokens.mockReturnValue([
      mockEvmToken,
      mockSolanaToken,
      mockTronToken,
      mockBitcoinToken,
    ]);

    const { result } = renderHook(() => useSendTokens());

    expect(mockUseAccountTokens).toHaveBeenCalledWith({
      includeNoBalance: false,
    });
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual(mockTronToken);
  });

  it('filters to Bitcoin tokens when isBitcoinSendType is true', () => {
    mockUseSendType.mockReturnValue({
      isEvmSendType: undefined,
      isEvmNativeSendType: undefined,
      isNonEvmSendType: true,
      isNonEvmNativeSendType: undefined,
      isSolanaSendType: undefined,
      isBitcoinSendType: true,
      isTronSendType: undefined,
    });
    mockUseAccountTokens.mockReturnValue([
      mockEvmToken,
      mockSolanaToken,
      mockTronToken,
      mockBitcoinToken,
    ]);

    const { result } = renderHook(() => useSendTokens());

    expect(mockUseAccountTokens).toHaveBeenCalledWith({
      includeNoBalance: false,
    });
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual(mockBitcoinToken);
  });

  it('passes includeNoBalance option to useAccountTokens', () => {
    mockUseAccountTokens.mockReturnValue([mockEvmToken]);

    renderHook(() => useSendTokens({ includeNoBalance: true }));

    expect(mockUseAccountTokens).toHaveBeenCalledWith({
      includeNoBalance: true,
    });
  });

  it('prioritizes first matching account type when multiple are true', () => {
    mockUseSendType.mockReturnValue({
      isEvmSendType: true,
      isEvmNativeSendType: undefined,
      isNonEvmSendType: true,
      isNonEvmNativeSendType: undefined,
      isSolanaSendType: true,
      isBitcoinSendType: undefined,
      isTronSendType: undefined,
    });
    mockUseAccountTokens.mockReturnValue([
      mockEvmToken,
      mockSolanaToken,
      mockTronToken,
      mockBitcoinToken,
    ]);

    const { result } = renderHook(() => useSendTokens());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toEqual(mockEvmToken);
  });
});
