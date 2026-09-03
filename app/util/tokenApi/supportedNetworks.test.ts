import { handleFetch } from '@metamask/controller-utils';
import {
  filterTokenApiSupportedCaipAssetIds,
  getTokenApiSupportedChainIds,
  hexChainIdToCaipChainId,
  isTokenApiChainSupported,
  resetTokenApiSupportedNetworksCacheForTesting,
  TOKEN_API_SUPPORTED_NETWORKS_URL,
} from './supportedNetworks';

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  handleFetch: jest.fn(),
}));

const mockHandleFetch = handleFetch as jest.Mock;

const SUPPORTED_NETWORKS_RESPONSE = {
  fullSupport: ['eip155:1', 'eip155:137'],
  partialSupport: ['eip155:8453'],
};

describe('tokenApi/supportedNetworks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetTokenApiSupportedNetworksCacheForTesting();
  });

  it('fetches and caches supported chain IDs', async () => {
    mockHandleFetch.mockResolvedValue(SUPPORTED_NETWORKS_RESPONSE);

    const first = await getTokenApiSupportedChainIds();
    const second = await getTokenApiSupportedChainIds();

    expect(first).toEqual(new Set(['eip155:1', 'eip155:137', 'eip155:8453']));
    expect(second).toEqual(first);
    expect(mockHandleFetch).toHaveBeenCalledTimes(1);
    expect(mockHandleFetch).toHaveBeenCalledWith(
      TOKEN_API_SUPPORTED_NETWORKS_URL,
    );
  });

  it('converts hex chain IDs to CAIP format', () => {
    expect(hexChainIdToCaipChainId('0xaa36a7')).toBe('eip155:11155111');
    expect(hexChainIdToCaipChainId('0x1')).toBe('eip155:1');
  });

  it('returns false for unsupported networks such as Sepolia', async () => {
    mockHandleFetch.mockResolvedValue(SUPPORTED_NETWORKS_RESPONSE);

    await expect(isTokenApiChainSupported('0xaa36a7')).resolves.toBe(false);
    await expect(isTokenApiChainSupported('0x1')).resolves.toBe(true);
  });

  it('filters asset IDs to supported networks only', async () => {
    mockHandleFetch.mockResolvedValue(SUPPORTED_NETWORKS_RESPONSE);

    const filtered = await filterTokenApiSupportedCaipAssetIds([
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      'eip155:11155111/erc20:0x7b79995e5f793a07b53987d39fffc615e1f0fbbb',
    ]);

    expect(filtered).toEqual([
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    ]);
  });

  it('returns an empty set when the supported-networks fetch fails', async () => {
    mockHandleFetch.mockRejectedValue(new Error('network error'));

    const supported = await getTokenApiSupportedChainIds();

    expect(supported).toEqual(new Set());
    await expect(isTokenApiChainSupported('0x1')).resolves.toBe(false);
  });
});
