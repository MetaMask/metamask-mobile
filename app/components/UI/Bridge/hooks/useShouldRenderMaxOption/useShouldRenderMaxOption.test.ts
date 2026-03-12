import { renderHook } from '@testing-library/react-hooks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  formatChainIdToHex,
  isNativeAddress,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { useShouldRenderMaxOption } from '.';
import { BridgeToken } from '../../types';
import { useTokenAddress } from '../useTokenAddress';
import { useIsSendBundleSupported } from '../useIsSendBundleSupported';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../useTokenAddress', () => ({
  useTokenAddress: jest.fn(),
}));

jest.mock('../useIsSendBundleSupported', () => ({
  useIsSendBundleSupported: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    formatChainIdToHex: jest.fn(),
    isNativeAddress: jest.fn(),
    isNonEvmChainId: jest.fn(),
  };
});

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseTokenAddress = useTokenAddress as jest.MockedFunction<
  typeof useTokenAddress
>;
const mockUseIsSendBundleSupported =
  useIsSendBundleSupported as jest.MockedFunction<
    typeof useIsSendBundleSupported
  >;
const mockFormatChainIdToHex = formatChainIdToHex as jest.MockedFunction<
  typeof formatChainIdToHex
>;
const mockIsNativeAddress = isNativeAddress as jest.MockedFunction<
  typeof isNativeAddress
>;
const mockIsNonEvmChainId = isNonEvmChainId as jest.MockedFunction<
  typeof isNonEvmChainId
>;

const mockToken: BridgeToken = {
  address: '0x1234567890123456789012345678901234567890',
  symbol: 'TEST',
  decimals: 18,
  chainId: CHAIN_IDS.MAINNET,
};

const nativeToken: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
  chainId: CHAIN_IDS.MAINNET,
};

const setSelectorValues = ({ stxEnabled = true }: { stxEnabled?: boolean }) => {
  mockUseSelector.mockImplementation(() => stxEnabled);
};

describe('useShouldRenderMaxOption', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setSelectorValues({ stxEnabled: true });
    mockUseTokenAddress.mockReturnValue(mockToken.address);
    mockUseIsSendBundleSupported.mockReturnValue(false);
    mockFormatChainIdToHex.mockImplementation(
      (chainId) => chainId as `0x${string}`,
    );
    mockIsNativeAddress.mockReturnValue(false);
    mockIsNonEvmChainId.mockReturnValue(false);
  });

  it('returns false when token is undefined', () => {
    const { result } = renderHook(() =>
      useShouldRenderMaxOption(undefined, '10'),
    );

    expect(result.current).toBe(false);
  });

  it('returns false when display balance is zero', () => {
    const { result } = renderHook(() =>
      useShouldRenderMaxOption(mockToken, '0'),
    );

    expect(result.current).toBe(false);
  });

  it('returns true for non-native token with positive balance', () => {
    mockIsNativeAddress.mockReturnValue(false);

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(mockToken, '10'),
    );

    expect(result.current).toBe(true);
  });

  it('returns true for native token when stx and sendBundle are enabled', () => {
    setSelectorValues({ stxEnabled: true });
    mockUseTokenAddress.mockReturnValue(nativeToken.address);
    mockIsNativeAddress.mockReturnValue(true);
    mockUseIsSendBundleSupported.mockReturnValue(true);

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(nativeToken, '1.25'),
    );

    expect(result.current).toBe(true);
  });

  it('returns false for native token when sendBundle is disabled', () => {
    setSelectorValues({ stxEnabled: true });
    mockUseTokenAddress.mockReturnValue(nativeToken.address);
    mockIsNativeAddress.mockReturnValue(true);
    mockUseIsSendBundleSupported.mockReturnValue(false);

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(nativeToken, '1.25'),
    );

    expect(result.current).toBe(false);
  });

  it('returns false for native token when stx is disabled even if sendBundle is enabled', () => {
    setSelectorValues({ stxEnabled: false });
    mockUseTokenAddress.mockReturnValue(nativeToken.address);
    mockIsNativeAddress.mockReturnValue(true);
    mockUseIsSendBundleSupported.mockReturnValue(true);

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(nativeToken, '1.25'),
    );

    expect(result.current).toBe(false);
  });

  it('returns true for sponsored native quote when stx is enabled', () => {
    setSelectorValues({ stxEnabled: true });
    mockUseTokenAddress.mockReturnValue(nativeToken.address);
    mockIsNativeAddress.mockReturnValue(true);
    mockUseIsSendBundleSupported.mockReturnValue(false);

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(nativeToken, '1.25', true),
    );

    expect(result.current).toBe(true);
  });

  it('returns false for sponsored native quote when stx is disabled', () => {
    setSelectorValues({ stxEnabled: false });
    mockUseTokenAddress.mockReturnValue(nativeToken.address);
    mockIsNativeAddress.mockReturnValue(true);

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(nativeToken, '1.25', true),
    );

    expect(result.current).toBe(false);
  });

  it('passes formatted EVM chain id to sendBundle hook', () => {
    const chainId = '0xa' as `0x${string}`;
    const formattedChainId = '0xa' as `0x${string}`;
    const token = { ...nativeToken, chainId };
    mockUseTokenAddress.mockReturnValue(token.address);
    mockIsNativeAddress.mockReturnValue(true);
    mockFormatChainIdToHex.mockReturnValue(formattedChainId);

    renderHook(() => useShouldRenderMaxOption(token, '1.25'));

    expect(mockUseIsSendBundleSupported).toHaveBeenCalledWith(formattedChainId);
  });

  it('passes undefined chain id to sendBundle hook for non-EVM token', () => {
    const solanaToken: BridgeToken = {
      ...nativeToken,
      chainId:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as `${string}:${string}`,
    };
    mockUseTokenAddress.mockReturnValue(solanaToken.address);
    mockIsNativeAddress.mockReturnValue(true);
    mockIsNonEvmChainId.mockReturnValue(true);
    setSelectorValues({ stxEnabled: false });

    const { result } = renderHook(() =>
      useShouldRenderMaxOption(solanaToken, '3'),
    );

    expect(mockUseIsSendBundleSupported).toHaveBeenCalledWith(undefined);
    expect(result.current).toBe(false);
  });
});
