import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { CaipChainId, Hex } from '@metamask/utils';
import { zeroAddress } from 'ethereumjs-util';
import {
  useAssetMetadata,
  AssetType,
} from '../../../../../UI/Bridge/hooks/useAssetMetadata';
import { selectIsBridgeEnabledSourceFactory } from '../../../../../../core/redux/slices/bridge';
import { getNativeSourceToken } from '../../../../../UI/Bridge/utils/tokenUtils';
import { useQuickBuySetup } from './hooks/useQuickBuySetup';
import type { QuickBuyTarget } from './types';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../../UI/Bridge/hooks/useAssetMetadata', () => ({
  ...jest.requireActual('../../../../../UI/Bridge/hooks/useAssetMetadata'),
  useAssetMetadata: jest.fn(),
}));

jest.mock('../../../../../UI/Bridge/utils/tokenUtils', () => ({
  ...jest.requireActual('../../../../../UI/Bridge/utils/tokenUtils'),
  getNativeSourceToken: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseAssetMetadata = useAssetMetadata as jest.MockedFunction<
  typeof useAssetMetadata
>;

const BASE_CAIP: CaipChainId = 'eip155:8453';
const MONAD_CAIP: CaipChainId = 'eip155:143';
const HYPE_CAIP: CaipChainId = 'eip155:999';
const SOLANA_CAIP: CaipChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const UNMAPPED_CAIP = 'eip155:9999' as CaipChainId;

const mockGetNativeSourceToken = getNativeSourceToken as jest.MockedFunction<
  typeof getNativeSourceToken
>;

const createTarget = (
  overrides: Partial<QuickBuyTarget> = {},
): QuickBuyTarget =>
  ({
    chain: BASE_CAIP,
    tokenAddress: '0x1234567890123456789012345678901234567890',
    tokenSymbol: 'TEST',
    tokenName: 'Test Token',
    ...overrides,
  }) as QuickBuyTarget;

describe('useQuickBuySetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNativeSourceToken.mockReset();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsBridgeEnabledSourceFactory) {
        return () => true;
      }
      return undefined;
    });
    mockUseAssetMetadata.mockReturnValue({
      assetMetadata: undefined,
      pending: false,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns empty setup when position is null', () => {
    const { result } = renderHook(() => useQuickBuySetup(null));

    expect(result.current).toEqual({
      chainId: undefined,
      destToken: undefined,
      isLoading: false,
      isUnsupportedChain: false,
    });
    expect(mockUseAssetMetadata).toHaveBeenCalledWith('', false, undefined);
  });

  it('marks chain as unsupported when not bridge-enabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsBridgeEnabledSourceFactory) {
        return () => false;
      }
      return undefined;
    });

    const target = createTarget({ chain: BASE_CAIP });
    const { result } = renderHook(() => useQuickBuySetup(target));

    expect(result.current).toEqual({
      chainId: undefined,
      destToken: undefined,
      isLoading: false,
      isUnsupportedChain: true,
    });
  });

  it('marks unsupported chains when the target chain is not bridge-enabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsBridgeEnabledSourceFactory) {
        return (chainId: string) => chainId !== UNMAPPED_CAIP;
      }
      return undefined;
    });
    const target = createTarget({ chain: UNMAPPED_CAIP });

    const { result } = renderHook(() => useQuickBuySetup(target));

    expect(result.current).toEqual({
      chainId: undefined,
      destToken: undefined,
      isLoading: false,
      isUnsupportedChain: true,
    });
    expect(mockUseAssetMetadata).toHaveBeenCalledWith(
      target.tokenAddress,
      false,
      undefined,
    );
  });

  it('uses the target token address for EVM destination tokens', () => {
    const target = createTarget({ chain: BASE_CAIP });

    mockUseAssetMetadata.mockReturnValue({
      assetMetadata: {
        address: '0x9999999999999999999999999999999999999999',
        symbol: 'TEST',
        decimals: 6,
        image: 'https://example.com/test-token.png',
        chainId: '0x2105',
        isNative: false,
        type: AssetType.token,
        balance: '',
        string: '',
      },
      pending: false,
    });

    const { result } = renderHook(() => useQuickBuySetup(target));

    expect(result.current.chainId).toBe('0x2105');
    expect(result.current.destToken).toEqual({
      address: target.tokenAddress,
      chainId: '0x2105',
      decimals: 6,
      image: 'https://example.com/test-token.png',
      name: target.tokenName,
      symbol: target.tokenSymbol,
    });
    expect(result.current.isUnsupportedChain).toBe(false);
  });

  it('uses the CAIP assetId for non-EVM destination tokens', () => {
    const target = createTarget({
      chain: SOLANA_CAIP,
      tokenAddress: 'ignored-on-non-evm',
    });

    mockUseAssetMetadata.mockReturnValue({
      assetMetadata: {
        address: 'solana-token-address',
        symbol: 'TEST',
        decimals: 9,
        image: 'https://example.com/solana-token.png',
        chainId: SOLANA_CAIP,
        isNative: false,
        type: AssetType.token,
        balance: '',
        string: '',
      },
      pending: true,
    });

    const { result } = renderHook(() => useQuickBuySetup(target));

    expect(result.current.chainId).toBe(SOLANA_CAIP);
    // For non-EVM destinations, address is the CAIP-19 assetId so it
    // matches the format of destAsset.assetId returned by the bridge
    // controller (used by useQuickBuyQuotes for token-pair matching).
    expect(result.current.destToken).toEqual({
      address: `${SOLANA_CAIP}/token:solana-token-address`,
      chainId: SOLANA_CAIP,
      decimals: 9,
      image: 'https://example.com/solana-token.png',
      name: target.tokenName,
      symbol: target.tokenSymbol,
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isUnsupportedChain).toBe(false);
  });

  it.each<{
    label: string;
    chain: CaipChainId;
    hexChainId: Hex;
    tokenSymbol: string;
    tokenName: string;
    nativeSymbol: string;
  }>([
    {
      label: 'MON on Monad',
      chain: MONAD_CAIP,
      hexChainId: '0x8f',
      tokenSymbol: 'MON',
      tokenName: 'Monad',
      nativeSymbol: 'MON',
    },
    {
      label: 'HYPE on HyperEVM',
      chain: HYPE_CAIP,
      hexChainId: '0x3e7',
      tokenSymbol: 'HYPE',
      tokenName: 'Hyperliquid',
      nativeSymbol: 'HYPE',
    },
  ])(
    'resolves $label from Token Details zero address without metadata fetch',
    ({ chain, hexChainId, tokenSymbol, tokenName, nativeSymbol }) => {
      mockGetNativeSourceToken.mockReturnValue({
        address: zeroAddress(),
        symbol: nativeSymbol,
        name: tokenName,
        decimals: 18,
        image: 'https://example.com/native.png',
        chainId: hexChainId,
      });

      const target = createTarget({
        chain,
        tokenAddress: zeroAddress(),
        tokenSymbol,
        tokenName,
      });

      const { result } = renderHook(() => useQuickBuySetup(target));

      expect(mockUseAssetMetadata).toHaveBeenCalledWith('', false, hexChainId);
      expect(mockGetNativeSourceToken).toHaveBeenCalledWith(hexChainId);
      expect(result.current.destToken).toEqual({
        address: zeroAddress(),
        chainId: hexChainId,
        decimals: 18,
        image: 'https://example.com/native.png',
        name: tokenName,
        symbol: tokenSymbol,
      });
      expect(result.current.isLoading).toBe(false);
    },
  );
});
