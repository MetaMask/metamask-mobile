import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { Position } from '@metamask/social-controllers';
import {
  useAssetMetadata,
  AssetType,
} from '../../../../../UI/Bridge/hooks/useAssetMetadata';
import { selectIsBridgeEnabledSourceFactory } from '../../../../../../core/redux/slices/bridge';
import { useQuickBuySetup } from './useQuickBuySetup';

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

const createPosition = (overrides: Partial<Position> = {}): Position =>
  ({
    chain: 'base',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    tokenSymbol: 'TEST',
    tokenName: 'Test Token',
    ...overrides,
  }) as Position;

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

    const position = createPosition({ chain: 'base' });
    const { result } = renderHook(() => useQuickBuySetup(position));

    expect(result.current).toEqual({
      chainId: undefined,
      destToken: undefined,
      isLoading: false,
      isUnsupportedChain: true,
    });
  });

  it('marks unsupported chains when the position chain is not mapped', () => {
    const position = createPosition({ chain: 'unknown-chain' });

    const { result } = renderHook(() => useQuickBuySetup(position));

    expect(result.current).toEqual({
      chainId: undefined,
      destToken: undefined,
      isLoading: false,
      isUnsupportedChain: true,
    });
    expect(mockUseAssetMetadata).toHaveBeenCalledWith(
      position.tokenAddress,
      false,
      undefined,
    );
  });

  it('uses the position token address for EVM destination tokens', () => {
    const position = createPosition({ chain: 'base' });

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

    const { result } = renderHook(() => useQuickBuySetup(position));

    expect(result.current.chainId).toBe('0x2105');
    expect(result.current.destToken).toEqual({
      address: position.tokenAddress,
      chainId: '0x2105',
      decimals: 6,
      image: 'https://example.com/test-token.png',
      name: position.tokenName,
      symbol: position.tokenSymbol,
    });
    expect(result.current.isUnsupportedChain).toBe(false);
  });

  it('uses the metadata address for non-EVM destination tokens', () => {
    const position = createPosition({
      chain: 'solana',
      tokenAddress: 'ignored-on-non-evm',
    });

    mockUseAssetMetadata.mockReturnValue({
      assetMetadata: {
        address: 'solana-token-address',
        symbol: 'TEST',
        decimals: 9,
        image: 'https://example.com/solana-token.png',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        isNative: false,
        type: AssetType.token,
        balance: '',
        string: '',
      },
      pending: true,
    });

    const { result } = renderHook(() => useQuickBuySetup(position));

    expect(result.current.chainId).toBe(
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    );
    expect(result.current.destToken).toEqual({
      address: 'solana-token-address',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      decimals: 9,
      image: 'https://example.com/solana-token.png',
      name: position.tokenName,
      symbol: position.tokenSymbol,
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isUnsupportedChain).toBe(false);
  });
});
