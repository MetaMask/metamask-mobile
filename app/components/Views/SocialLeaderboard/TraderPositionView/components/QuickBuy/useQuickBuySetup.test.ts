import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import {
  useAssetMetadata,
  AssetType,
} from '../../../../../UI/Bridge/hooks/useAssetMetadata';
import { selectIsBridgeEnabledSourceFactory } from '../../../../../../core/redux/slices/bridge';
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

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseAssetMetadata = useAssetMetadata as jest.MockedFunction<
  typeof useAssetMetadata
>;

const BASE_CAIP: CaipChainId = 'eip155:8453';
const SOLANA_CAIP: CaipChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const TRON_CAIP: CaipChainId = 'tron:728126428';
const UNMAPPED_CAIP = 'eip155:9999' as CaipChainId;
/** HTX (TRC-20) contract address on Tron — base58. */
const TRON_TOKEN_ADDRESS = 'TUPM7K8REVzD2UdV4R5fe5M8XbnR2DdoJ6';

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
      isDestTokenUnavailable: false,
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
      isDestTokenUnavailable: false,
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
      isDestTokenUnavailable: false,
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

  it('builds a Tron TRC-20 dest token from host-provided metadata without fetching', () => {
    // Arrange — the asset-details host already holds the resolved token
    // (decimals + image), so setup must not depend on the metadata API.
    const target = createTarget({
      chain: TRON_CAIP,
      tokenAddress: `${TRON_CAIP}/trc20:${TRON_TOKEN_ADDRESS}`,
      tokenSymbol: 'HTX',
      tokenName: 'HTX DAO',
      tokenDecimals: 18,
      tokenImage: 'https://example.com/htx.png',
    });

    // Act
    const { result } = renderHook(() => useQuickBuySetup(target));

    // Assert — dest token resolves synchronously with the CAIP-19 assetId
    // address (matching destAsset.assetId on bridge quotes) and the metadata
    // fetch stays disabled.
    expect(result.current.chainId).toBe(TRON_CAIP);
    expect(result.current.isUnsupportedChain).toBe(false);
    expect(result.current.isDestTokenUnavailable).toBe(false);
    expect(result.current.destToken).toEqual({
      address: `${TRON_CAIP}/trc20:${TRON_TOKEN_ADDRESS}`,
      chainId: TRON_CAIP,
      decimals: 18,
      image: 'https://example.com/htx.png',
      name: 'HTX DAO',
      symbol: 'HTX',
    });
    expect(mockUseAssetMetadata).toHaveBeenCalledWith(
      TRON_TOKEN_ADDRESS,
      false,
      TRON_CAIP,
    );
  });

  it('builds an EVM dest token from host-provided metadata without fetching', () => {
    // Arrange
    const target = createTarget({
      chain: BASE_CAIP,
      tokenDecimals: 6,
      tokenImage: 'https://example.com/test-token.png',
    });

    // Act
    const { result } = renderHook(() => useQuickBuySetup(target));

    // Assert — bare hex address preserved for EVM, no fetch.
    expect(result.current.destToken).toEqual({
      address: target.tokenAddress,
      chainId: '0x2105',
      decimals: 6,
      image: 'https://example.com/test-token.png',
      name: target.tokenName,
      symbol: target.tokenSymbol,
    });
    expect(mockUseAssetMetadata).toHaveBeenCalledWith(
      target.tokenAddress,
      false,
      '0x2105',
    );
  });

  it('resolves a Tron TRC-20 dest token via the metadata fallback when the host has no metadata', () => {
    // Arrange — social-feed-style target (address only); metadata comes from
    // the Token Metadata API, which returns the bare base58 address.
    const target = createTarget({
      chain: TRON_CAIP,
      tokenAddress: `${TRON_CAIP}/trc20:${TRON_TOKEN_ADDRESS}`,
      tokenSymbol: 'HTX',
      tokenName: 'HTX DAO',
    });
    mockUseAssetMetadata.mockReturnValue({
      assetMetadata: {
        address: TRON_TOKEN_ADDRESS,
        symbol: 'HTX',
        decimals: 18,
        image: 'https://example.com/htx.png',
        chainId: TRON_CAIP,
        isNative: false,
        type: AssetType.token,
        balance: '',
        string: '',
      },
      pending: false,
    });

    // Act
    const { result } = renderHook(() => useQuickBuySetup(target));

    // Assert — fetch enabled with the unwrapped reference, address rewrapped
    // into the trc20 CAIP-19 assetId.
    expect(result.current.chainId).toBe(TRON_CAIP);
    expect(result.current.isUnsupportedChain).toBe(false);
    expect(result.current.destToken).toEqual({
      address: `${TRON_CAIP}/trc20:${TRON_TOKEN_ADDRESS}`,
      chainId: TRON_CAIP,
      decimals: 18,
      image: 'https://example.com/htx.png',
      name: 'HTX DAO',
      symbol: 'HTX',
    });
    expect(mockUseAssetMetadata).toHaveBeenCalledWith(
      TRON_TOKEN_ADDRESS,
      true,
      TRON_CAIP,
    );
  });

  it('keeps native Tron assets supported via the native asset registry', () => {
    // Arrange — native TRX (slip44 reference) resolves synchronously from the
    // chain's native asset registry, without any metadata fetch.
    const target = createTarget({
      chain: TRON_CAIP,
      tokenAddress: `${TRON_CAIP}/slip44:195`,
      tokenSymbol: 'TRX',
      tokenName: 'TRON',
    });

    // Act
    const { result } = renderHook(() => useQuickBuySetup(target));

    // Assert
    expect(result.current.chainId).toBe(TRON_CAIP);
    expect(result.current.isUnsupportedChain).toBe(false);
    expect(result.current.destToken).toEqual(
      expect.objectContaining({ symbol: 'TRX', chainId: TRON_CAIP }),
    );
    expect(result.current.isDestTokenUnavailable).toBe(false);
  });

  it('flags the dest token as unavailable when metadata settles without a result', () => {
    // Arrange — supported EVM chain, metadata lookup finished empty (the
    // beforeEach default: assetMetadata undefined, pending false).
    const target = createTarget({ chain: BASE_CAIP });

    // Act
    const { result } = renderHook(() => useQuickBuySetup(target));

    // Assert — the consumer must surface this instead of dead-ending.
    expect(result.current.chainId).toBe('0x2105');
    expect(result.current.isUnsupportedChain).toBe(false);
    expect(result.current.destToken).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isDestTokenUnavailable).toBe(true);
  });

  it('does not flag the dest token as unavailable while metadata is loading', () => {
    // Arrange
    mockUseAssetMetadata.mockReturnValue({
      assetMetadata: undefined,
      pending: true,
    });
    const target = createTarget({ chain: BASE_CAIP });

    // Act
    const { result } = renderHook(() => useQuickBuySetup(target));

    // Assert
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isDestTokenUnavailable).toBe(false);
  });
});
