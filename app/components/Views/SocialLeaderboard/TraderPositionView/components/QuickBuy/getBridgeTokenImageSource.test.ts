import {
  getNativeAssetForChainId,
  isNativeAddress,
} from '@metamask/bridge-controller';
import { getAssetImageUrl } from '../../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import { getBridgeTokenImageSource } from './getBridgeTokenImageSource';

jest.mock('../../../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  getNativeAssetForChainId: jest.fn(),
  isNativeAddress: jest.fn(),
}));

const mockGetAssetImageUrl = getAssetImageUrl as jest.MockedFunction<
  typeof getAssetImageUrl
>;
const mockGetNativeAssetForChainId =
  getNativeAssetForChainId as jest.MockedFunction<
    typeof getNativeAssetForChainId
  >;
const mockIsNativeAddress = isNativeAddress as jest.MockedFunction<
  typeof isNativeAddress
>;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

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
    mockIsNativeAddress.mockReturnValue(false);
  });

  it('returns the token image URI when token.image is set', () => {
    const token = { ...baseToken, image: 'https://cdn.example.com/eth.png' };
    expect(getBridgeTokenImageSource(token)).toEqual({
      uri: 'https://cdn.example.com/eth.png',
    });
    expect(mockGetAssetImageUrl).not.toHaveBeenCalled();
  });

  it('returns the CDN fallback URI for an ERC-20 using its own address', () => {
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

  it('resolves native tokens through their SLIP-44 asset id', () => {
    const token: BridgeToken = {
      ...baseToken,
      address: ZERO_ADDRESS,
      chainId: '0xe708',
    };
    mockIsNativeAddress.mockReturnValue(true);
    mockGetNativeAssetForChainId.mockReturnValue({
      assetId: 'eip155:59144/slip44:60',
    } as unknown as ReturnType<typeof getNativeAssetForChainId>);
    mockGetAssetImageUrl.mockReturnValue('https://cdn.example.com/slip44.png');

    expect(getBridgeTokenImageSource(token)).toEqual({
      uri: 'https://cdn.example.com/slip44.png',
    });
    expect(mockGetAssetImageUrl).toHaveBeenCalledWith(
      'eip155:59144/slip44:60',
      '0xe708',
    );
  });

  it('falls back to the token address when getNativeAssetForChainId throws', () => {
    const token: BridgeToken = {
      ...baseToken,
      address: ZERO_ADDRESS,
      chainId: '0xe708',
    };
    mockIsNativeAddress.mockReturnValue(true);
    mockGetNativeAssetForChainId.mockImplementation(() => {
      throw new Error('unsupported chain');
    });
    mockGetAssetImageUrl.mockReturnValue('https://cdn.example.com/zero.png');

    expect(getBridgeTokenImageSource(token)).toEqual({
      uri: 'https://cdn.example.com/zero.png',
    });
    expect(mockGetAssetImageUrl).toHaveBeenCalledWith(ZERO_ADDRESS, '0xe708');
  });

  it('returns undefined when token.image is absent and getAssetImageUrl returns null', () => {
    const token = { ...baseToken };
    mockGetAssetImageUrl.mockReturnValue(undefined);

    expect(getBridgeTokenImageSource(token)).toBeUndefined();
  });
});
