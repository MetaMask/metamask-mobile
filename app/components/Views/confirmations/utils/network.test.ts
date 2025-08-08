import { getNetworkBadgeSource } from './network';
import {
  isTestNet,
  getTestNetImageByChainId,
  getDefaultNetworkByChainId,
} from '../../../../util/networks';
import { getNonEvmNetworkImageSourceByChainId } from '../../../../util/networks/customNetworks';
import { isCaipChainId } from '@metamask/utils';

jest.mock('../../../../util/networks', () => ({
  isTestNet: jest.fn(),
  getTestNetImageByChainId: jest.fn(),
  getDefaultNetworkByChainId: jest.fn(),
}));

jest.mock('../../../../util/networks/customNetworks', () => ({
  UnpopularNetworkList: [
    {
      chainId: '0xfa',
      rpcPrefs: { imageSource: 'unpopular-network-image-source' },
    },
  ],
  CustomNetworkImgMapping: {
    '0x123': 'custom-network-image-source',
  },
  PopularList: [
    {
      chainId: '0x2a',
      rpcPrefs: { imageSource: 'popular-network-image-source' },
    },
  ],
  getNonEvmNetworkImageSourceByChainId: jest.fn(),
}));

jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
  isCaipChainId: jest.fn(),
}));

describe('getNetworkBadgeSource', () => {
  const mockIsTestNet = isTestNet as jest.MockedFunction<typeof isTestNet>;
  const mockGetTestNetImageByChainId =
    getTestNetImageByChainId as jest.MockedFunction<
      typeof getTestNetImageByChainId
    >;
  const mockGetDefaultNetworkByChainId =
    getDefaultNetworkByChainId as jest.MockedFunction<
      typeof getDefaultNetworkByChainId
    >;
  const mockGetNonEvmNetworkImageSourceByChainId =
    getNonEvmNetworkImageSourceByChainId as jest.MockedFunction<
      typeof getNonEvmNetworkImageSourceByChainId
    >;
  const mockIsCaipChainId = isCaipChainId as jest.MockedFunction<
    typeof isCaipChainId
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when chainId is a testnet', () => {
    it('returns testnet image source', () => {
      const chainId = '0xaa36a7';
      const expectedImageSource = { uri: 'testnet-image-source' };

      mockIsTestNet.mockReturnValue(true);
      mockGetTestNetImageByChainId.mockReturnValue(expectedImageSource);

      const result = getNetworkBadgeSource(chainId);

      expect(mockIsTestNet).toHaveBeenCalledWith(chainId);
      expect(mockGetTestNetImageByChainId).toHaveBeenCalledWith(chainId);
      expect(result).toBe(expectedImageSource);
    });
  });

  describe('when chainId has a default network', () => {
    it('returns default network image source', () => {
      const chainId = '0x1';
      const expectedImageSource = 'default-network-image-source';

      mockIsTestNet.mockReturnValue(false);
      mockGetDefaultNetworkByChainId.mockReturnValue({
        imageSource: expectedImageSource,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = getNetworkBadgeSource(chainId);

      expect(mockGetDefaultNetworkByChainId).toHaveBeenCalledWith(chainId);
      expect(result).toBe(expectedImageSource);
    });
  });

  describe('when chainId is in unpopular network list', () => {
    it('returns unpopular network image source', () => {
      const chainId = '0xfa';
      const expectedImageSource = 'unpopular-network-image-source';

      mockIsTestNet.mockReturnValue(false);
      mockGetDefaultNetworkByChainId.mockReturnValue(undefined);

      const result = getNetworkBadgeSource(chainId);

      expect(result).toBe(expectedImageSource);
    });
  });

  describe('when chainId is in popular network list', () => {
    it('returns popular network image source', () => {
      const chainId = '0x2a';
      const expectedImageSource = 'popular-network-image-source';

      mockIsTestNet.mockReturnValue(false);
      mockGetDefaultNetworkByChainId.mockReturnValue(undefined);

      const result = getNetworkBadgeSource(chainId);

      expect(result).toBe(expectedImageSource);
    });
  });

  describe('when chainId is a CAIP chain ID', () => {
    it('returns non-EVM network image source', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chainId = 'eip155:1' as any;
      const expectedImageSource = { uri: 'non-evm-network-image-source' };

      mockIsTestNet.mockReturnValue(false);
      mockGetDefaultNetworkByChainId.mockReturnValue(undefined);
      mockIsCaipChainId.mockReturnValue(true);
      mockGetNonEvmNetworkImageSourceByChainId.mockReturnValue(
        expectedImageSource,
      );

      const result = getNetworkBadgeSource(chainId);

      expect(mockIsCaipChainId).toHaveBeenCalledWith(chainId);
      expect(mockGetNonEvmNetworkImageSourceByChainId).toHaveBeenCalledWith(
        chainId,
      );
      expect(result).toBe(expectedImageSource);
    });
  });

  describe('when chainId has custom network image mapping', () => {
    it('returns custom network image source', () => {
      const chainId = '0x123';
      const expectedImageSource = 'custom-network-image-source';

      mockIsTestNet.mockReturnValue(false);
      mockGetDefaultNetworkByChainId.mockReturnValue(undefined);
      mockIsCaipChainId.mockReturnValue(false);

      const result = getNetworkBadgeSource(chainId);

      expect(result).toBe(expectedImageSource);
    });
  });

  describe('when no image source is found', () => {
    it('returns undefined', () => {
      const chainId = '0x999';

      mockIsTestNet.mockReturnValue(false);
      mockGetDefaultNetworkByChainId.mockReturnValue(undefined);
      mockIsCaipChainId.mockReturnValue(false);

      const result = getNetworkBadgeSource(chainId);

      expect(result).toBeUndefined();
    });
  });

  describe('priority order', () => {
    it('prioritizes testnet over default network', () => {
      const chainId = '0xaa36a7';
      const testnetImageSource = { uri: 'testnet-image' };
      const defaultImageSource = 'default-image';

      mockIsTestNet.mockReturnValue(true);
      mockGetTestNetImageByChainId.mockReturnValue(testnetImageSource);
      mockGetDefaultNetworkByChainId.mockReturnValue({
        imageSource: defaultImageSource,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = getNetworkBadgeSource(chainId);

      expect(result).toBe(testnetImageSource);
    });
  });
});
