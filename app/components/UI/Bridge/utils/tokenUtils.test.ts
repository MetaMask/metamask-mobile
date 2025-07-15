import { constants } from 'ethers';
import { createTokenFromCaip, getNativeSourceToken } from './tokenUtils';
import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';
import {
  getNativeAssetForChainId,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { safeToChecksumAddress } from '../../../../util/address';

// Mock dependencies
jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
  isCaipAssetType: jest.fn(),
  parseCaipAssetType: jest.fn(),
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

  describe('createTokenFromCaip', () => {
    it('returns null for invalid CAIP format', () => {
      (isCaipAssetType as unknown as jest.Mock).mockReturnValue(false);

      const result = createTokenFromCaip('invalid-format');

      expect(result).toBeNull();
      expect(isCaipAssetType).toHaveBeenCalledWith('invalid-format');
    });

    it('creates native token from slip44 namespace', () => {
      const mockNativeAsset = {
        address: constants.AddressZero,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      };

      (isCaipAssetType as unknown as jest.Mock).mockReturnValue(true);
      (parseCaipAssetType as jest.Mock).mockReturnValue({
        assetNamespace: 'slip44',
        assetReference: '60',
        chainId: 'eip155:1',
      });
      (getNativeAssetForChainId as jest.Mock).mockReturnValue(mockNativeAsset);
      (isSolanaChainId as jest.Mock).mockReturnValue(false);

      const result = createTokenFromCaip('eip155:1/slip44:60');

      expect(result).toEqual({
        address: mockNativeAsset.address,
        name: mockNativeAsset.name,
        symbol: mockNativeAsset.symbol,
        image: undefined,
        decimals: mockNativeAsset.decimals,
        chainId: 'eip155:1',
      });
      expect(getNativeAssetForChainId).toHaveBeenCalledWith('eip155:1');
    });

    it('creates ERC20 token with checksum address', () => {
      const checksumAddress = '0xA0b86a33E6776d02b5C07b4E92b1B3a8E1B9b1A4';

      (isCaipAssetType as unknown as jest.Mock).mockReturnValue(true);
      (parseCaipAssetType as jest.Mock).mockReturnValue({
        assetNamespace: 'erc20',
        assetReference: '0xa0b86a33e6776d02b5c07b4e92b1b3a8e1b9b1a4',
        chainId: 'eip155:1',
      });
      (safeToChecksumAddress as jest.Mock).mockReturnValue(checksumAddress);

      const result = createTokenFromCaip(
        'eip155:1/erc20:0xa0b86a33e6776d02b5c07b4e92b1b3a8e1b9b1a4',
      );

      expect(result).toEqual({
        address: checksumAddress,
        symbol: '',
        name: '',
        decimals: 18,
        chainId: 'eip155:1',
      });
      expect(safeToChecksumAddress).toHaveBeenCalledWith(
        '0xa0b86a33e6776d02b5c07b4e92b1b3a8e1b9b1a4',
      );
    });

    it('creates ERC20 token with original address when checksum fails', () => {
      const originalAddress = '0xa0b86a33e6776d02b5c07b4e92b1b3a8e1b9b1a4';

      (isCaipAssetType as unknown as jest.Mock).mockReturnValue(true);
      (parseCaipAssetType as jest.Mock).mockReturnValue({
        assetNamespace: 'erc20',
        assetReference: originalAddress,
        chainId: 'eip155:1',
      });
      (safeToChecksumAddress as jest.Mock).mockReturnValue(null);

      const result = createTokenFromCaip(
        'eip155:1/erc20:0xa0b86a33e6776d02b5c07b4e92b1b3a8e1b9b1a4',
      );

      expect(result).toEqual({
        address: originalAddress,
        symbol: '',
        name: '',
        decimals: 18,
        chainId: 'eip155:1',
      });
      expect(safeToChecksumAddress).toHaveBeenCalledWith(originalAddress);
    });

    it('creates non-EVM chain token', () => {
      const caipAssetType =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/spltoken:4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R';

      (isCaipAssetType as unknown as jest.Mock).mockReturnValue(true);
      (parseCaipAssetType as jest.Mock).mockReturnValue({
        assetNamespace: 'spltoken',
        assetReference: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });

      const result = createTokenFromCaip(caipAssetType);

      expect(result).toEqual({
        address: caipAssetType,
        symbol: '',
        name: '',
        decimals: 18,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      });
    });

    it('returns null when parsing throws error', () => {
      (isCaipAssetType as unknown as jest.Mock).mockReturnValue(true);
      (parseCaipAssetType as jest.Mock).mockImplementation(() => {
        throw new Error('Parse error');
      });

      const result = createTokenFromCaip(
        'eip155:1/erc20:0xa0b86a33e6776d02b5c07b4e92b1b3a8e1b9b1a4',
      );

      expect(result).toBeNull();
    });
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
