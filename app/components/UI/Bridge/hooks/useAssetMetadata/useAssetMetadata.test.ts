import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { AssetType, useAssetMetadata } from './index';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockFetchAssetMetadata = jest.fn();
const mockGetAssetImageUrl = jest.fn();

jest.mock('./utils', () => ({
  fetchAssetMetadata: (...args: unknown[]) => mockFetchAssetMetadata(...args),
  getAssetImageUrl: (...args: unknown[]) => mockGetAssetImageUrl(...args),
}));

const mockChainIdEvm = '0x1';
const mockSearchQueryEvm = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const mockAssetIdEvm = 'eip155:1/erc20:0x123';

const mockChainIdSol = 'solana:101';
const mockSearchQuerySol = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm';
const mockAssetIdSol =
  'solana:101/token:EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm';

describe('useAssetMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue(true); // allowExternalServices = true
    mockGetAssetImageUrl.mockReturnValue('mock-image-url');
  });

  it('should return undefined when external services are disabled', async () => {
    (useSelector as jest.Mock).mockReturnValue(false); // allowExternalServices = false

    const { result, waitForNextUpdate } = renderHook(() =>
      useAssetMetadata(mockSearchQuerySol, true, mockChainIdSol),
    );

    await waitForNextUpdate();
    expect(result.current.assetMetadata).toBeUndefined();
    expect(mockFetchAssetMetadata).not.toHaveBeenCalled();
  });

  it('should return undefined when chainId is not provided', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useAssetMetadata(mockSearchQuerySol, true),
    );

    await waitForNextUpdate();
    expect(result.current.assetMetadata).toBeUndefined();
    expect(mockFetchAssetMetadata).not.toHaveBeenCalled();
  });

  it('should return undefined when search query is empty', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useAssetMetadata('', true, mockChainIdEvm),
    );

    await waitForNextUpdate();
    expect(result.current.assetMetadata).toBeUndefined();
    expect(mockFetchAssetMetadata).not.toHaveBeenCalled();
  });

  it('should return undefined when search query is not an address', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useAssetMetadata('not-an-address', true, mockChainIdEvm),
    );

    await waitForNextUpdate();
    expect(result.current.assetMetadata).toBeUndefined();
    expect(mockFetchAssetMetadata).not.toHaveBeenCalled();
  });

  describe('EVM', () => {
    it('should fetch and return asset metadata when conditions are met', async () => {
      const mockMetadata = {
        address: mockSearchQueryEvm,
        symbol: 'TEST',
        decimals: 18,
        assetId: mockAssetIdEvm,
        chainId: mockChainIdEvm,
      };

      mockFetchAssetMetadata.mockResolvedValueOnce(mockMetadata);

      const { result, waitForNextUpdate } = renderHook(() =>
        useAssetMetadata(mockSearchQueryEvm, true, mockChainIdEvm),
      );

      await waitForNextUpdate();

      expect(result.current.assetMetadata).toEqual({
        ...mockMetadata,
        chainId: mockChainIdEvm,
        isNative: false,
        type: AssetType.token,
        image: 'mock-image-url',
        balance: '',
        string: '',
      });

      expect(mockFetchAssetMetadata).toHaveBeenCalledWith(
        mockSearchQueryEvm.trim(),
        mockChainIdEvm,
      );
      expect(mockGetAssetImageUrl).toHaveBeenCalledWith(
        mockAssetIdEvm,
        mockChainIdEvm,
      );
    });
  });
  describe('Solana', () => {
    it('should fetch and return asset metadata when conditions are met', async () => {
      const mockMetadata = {
        address: mockSearchQuerySol,
        symbol: 'TEST',
        decimals: 18,
        assetId: mockAssetIdSol,
        chainId: mockChainIdSol,
      };

      mockFetchAssetMetadata.mockResolvedValueOnce(mockMetadata);

      const { result, waitForNextUpdate } = renderHook(() =>
        useAssetMetadata(mockSearchQuerySol, true, mockChainIdSol),
      );

      await waitForNextUpdate();

      expect(result.current.assetMetadata).toEqual({
        ...mockMetadata,
        chainId: mockChainIdSol,
        isNative: false,
        type: AssetType.token,
        image: 'mock-image-url',
        balance: '',
        string: '',
      });

      expect(mockFetchAssetMetadata).toHaveBeenCalledWith(
        mockSearchQuerySol.trim(),
        mockChainIdSol,
      );
      expect(mockGetAssetImageUrl).toHaveBeenCalledWith(
        mockAssetIdSol,
        mockChainIdSol,
      );
    });
  });

  it('should return undefined when fetchAssetMetadata returns undefined', async () => {
    mockFetchAssetMetadata.mockResolvedValueOnce(undefined);

    const { result, waitForNextUpdate } = renderHook(() =>
      useAssetMetadata(mockSearchQuerySol, true, mockChainIdSol),
    );

    await waitForNextUpdate();
    expect(result.current.assetMetadata).toBeUndefined();

    expect(mockFetchAssetMetadata).toHaveBeenCalledWith(
      mockSearchQuerySol.trim(),
      mockChainIdSol,
    );
  });

  it('should handle errors gracefully', async () => {
    mockFetchAssetMetadata.mockRejectedValueOnce(new Error('API Error'));

    const { result, waitForNextUpdate } = renderHook(() =>
      useAssetMetadata(mockSearchQuerySol, true, mockChainIdSol),
    );

    await waitForNextUpdate();
    expect(result.current.assetMetadata).toBeUndefined();

    expect(mockFetchAssetMetadata).toHaveBeenCalledWith(
      mockSearchQuerySol.trim(),
      mockChainIdSol,
    );
  });
});
