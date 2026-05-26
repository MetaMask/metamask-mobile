import { getBridgeTokenImageSource } from './getBridgeTokenImageSource';
import { getAssetImageUrl } from '../../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import type { BridgeToken } from '../../../../../UI/Bridge/types';

jest.mock('../../../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: jest.fn(),
}));

const mockGetAssetImageUrl = getAssetImageUrl as jest.MockedFunction<
  typeof getAssetImageUrl
>;

const baseToken: BridgeToken = {
  address: '0xabc',
  chainId: '0x1',
  symbol: 'ETH',
  decimals: 18,
  name: 'Ethereum',
};

describe('getBridgeTokenImageSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the token image URI when token.image is set', () => {
    const token = { ...baseToken, image: 'https://cdn.example.com/eth.png' };
    expect(getBridgeTokenImageSource(token)).toEqual({
      uri: 'https://cdn.example.com/eth.png',
    });
    expect(mockGetAssetImageUrl).not.toHaveBeenCalled();
  });

  it('returns the CDN fallback URI when token.image is absent but getAssetImageUrl resolves', () => {
    const token = { ...baseToken };
    mockGetAssetImageUrl.mockReturnValue('https://cdn.example.com/0xabc.png');

    expect(getBridgeTokenImageSource(token)).toEqual({
      uri: 'https://cdn.example.com/0xabc.png',
    });
    expect(mockGetAssetImageUrl).toHaveBeenCalledWith(
      token.address,
      token.chainId,
    );
  });

  it('returns undefined when token.image is absent and getAssetImageUrl returns null', () => {
    const token = { ...baseToken };
    mockGetAssetImageUrl.mockReturnValue(undefined);

    expect(getBridgeTokenImageSource(token)).toBeUndefined();
  });
});
