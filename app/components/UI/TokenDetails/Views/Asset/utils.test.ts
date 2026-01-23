import '../../UI/Bridge/_mocks_/initialState';
import { getIsSwapsAssetAllowed } from './utils';
import { SolScope } from '@metamask/keyring-api';

describe('getIsSwapsAssetAllowed', () => {
  const mockSearchDiscoverySwapsTokens = ['0xtoken3', '0xtoken4'];

  describe('EVM assets', () => {
    it('should return true for ETH assets', () => {
      const result = getIsSwapsAssetAllowed({
        asset: {
          isETH: true,
          isNative: false,
          address: '0x0',
          chainId: '0x1',
        },
        searchDiscoverySwapsTokens: mockSearchDiscoverySwapsTokens,
      });
      expect(result).toBe(true);
    });

    it('should return true for native assets', () => {
      const result = getIsSwapsAssetAllowed({
        asset: {
          isETH: false,
          isNative: true,
          address: '0x0',
          chainId: '0x1',
        },
        searchDiscoverySwapsTokens: mockSearchDiscoverySwapsTokens,
      });
      expect(result).toBe(true);
    });

    it('should return true for tokens from search discovery', () => {
      const result = getIsSwapsAssetAllowed({
        asset: {
          isETH: false,
          isNative: false,
          address: '0xtoken3',
          chainId: '0x1',
          isFromSearch: true,
        },
        searchDiscoverySwapsTokens: mockSearchDiscoverySwapsTokens,
      });
      expect(result).toBe(true);
    });

    it('should return true for all other EVM tokens', () => {
      const result = getIsSwapsAssetAllowed({
        asset: {
          isETH: false,
          isNative: false,
          address: '0xtoken1',
          chainId: '0x1',
        },
        searchDiscoverySwapsTokens: mockSearchDiscoverySwapsTokens,
      });
      expect(result).toBe(true);
    });
  });

  describe('Solana assets', () => {
    it('should return true for Solana assets', () => {
      const result = getIsSwapsAssetAllowed({
        asset: {
          isETH: false,
          isNative: false,
          address: 'any-address',
          chainId: SolScope.Mainnet,
        },
        searchDiscoverySwapsTokens: mockSearchDiscoverySwapsTokens,
      });
      expect(result).toBe(true);
    });
  });
});
