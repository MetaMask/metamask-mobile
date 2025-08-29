import { constants } from 'ethers';
import { getNativeSourceToken } from './tokenUtils';
import {
  getNativeAssetForChainId,
  isSolanaChainId,
} from '@metamask/bridge-controller';

// Mock dependencies
jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
  isCaipAssetType: jest.fn(),
  parseCaipAssetType: jest.fn(),
  parseCaipChainId: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  getNativeAssetForChainId: jest.fn(),
  isSolanaChainId: jest.fn(),
}));

jest.mock('../../../../util/address', () => ({
  safeToChecksumAddress: jest.fn(),
}));

describe('tokenUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNativeSourceToken', () => {
    it('returns formatted native token for EVM chain', () => {
      const mockNativeAsset = {
        address: constants.AddressZero,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      };

      (isSolanaChainId as jest.Mock).mockReturnValue(false);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue(mockNativeAsset);

      const result = getNativeSourceToken('eip155:1');

      expect(result).toEqual({
        address: constants.AddressZero,
        name: 'Ethereum',
        symbol: 'ETH',
        image: undefined,
        decimals: 18,
        chainId: 'eip155:1',
      });
      expect(getNativeAssetForChainId).toHaveBeenCalledWith('eip155:1');
      expect(isSolanaChainId).toHaveBeenCalledWith('eip155:1');
    });

    it('returns formatted native token for Solana chain using assetId', () => {
      const mockNativeAsset = {
        address: constants.AddressZero,
        assetId: 'native-sol-asset-id',
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
      };

      (isSolanaChainId as jest.Mock).mockReturnValue(true);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue(mockNativeAsset);

      const result = getNativeSourceToken(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );

      expect(result).toEqual({
        address: 'native-sol-asset-id',
        name: 'Solana',
        symbol: 'SOL',
        image: undefined,
        decimals: 9,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });
      expect(getNativeAssetForChainId).toHaveBeenCalledWith(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
      expect(isSolanaChainId).toHaveBeenCalledWith(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
    });

    it('returns native token with icon when iconUrl present', () => {
      const mockNativeAsset = {
        address: constants.AddressZero,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        iconUrl: 'https://example.com/eth-icon.png',
      };

      (isSolanaChainId as jest.Mock).mockReturnValue(false);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue(mockNativeAsset);

      const result = getNativeSourceToken('eip155:1');

      expect(result).toEqual({
        address: constants.AddressZero,
        name: 'Ethereum',
        symbol: 'ETH',
        image: 'https://example.com/eth-icon.png',
        decimals: 18,
        chainId: 'eip155:1',
      });
    });

    it('returns native token with empty name when name missing', () => {
      const mockNativeAsset = {
        address: constants.AddressZero,
        symbol: 'ETH',
        decimals: 18,
      };

      (isSolanaChainId as jest.Mock).mockReturnValue(false);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue(mockNativeAsset);

      const result = getNativeSourceToken('eip155:1');

      expect(result).toEqual({
        address: constants.AddressZero,
        name: '',
        symbol: 'ETH',
        image: undefined,
        decimals: 18,
        chainId: 'eip155:1',
      });
    });
  });
});
