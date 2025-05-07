import { isBridgeAllowed } from './index';
import AppConstants from '../../../../core/AppConstants';
import {
  ARBITRUM_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  ETH_CHAIN_ID,
  LINEA_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  POLYGON_CHAIN_ID,
  ZKSYNC_ERA_CHAIN_ID,
} from '@metamask/swaps-controller/dist/constants';
import { Hex } from '@metamask/utils';

jest.mock('../../../../core/AppConstants', () => ({
  BRIDGE: {
    ACTIVE: true,
  },
}));

describe('Bridge Utils', () => {
  describe('isBridgeAllowed', () => {
    const supportedChainIds: Hex[] = [
      ETH_CHAIN_ID,
      OPTIMISM_CHAIN_ID,
      BSC_CHAIN_ID,
      POLYGON_CHAIN_ID,
      ZKSYNC_ERA_CHAIN_ID,
      BASE_CHAIN_ID,
      ARBITRUM_CHAIN_ID,
      AVALANCHE_CHAIN_ID,
      LINEA_CHAIN_ID,
    ];

    it('should return true when bridge is active and chain ID is allowed', () => {
      supportedChainIds.forEach((chainId) => {
        expect(isBridgeAllowed(chainId)).toBe(true);
      });
    });

    it('should return false when bridge is active but chain ID is not allowed', () => {
      const unsupportedChainId = '0x1234' as Hex;
      expect(isBridgeAllowed(unsupportedChainId)).toBe(false);
    });

    it('should return false when bridge is inactive', () => {
      Object.defineProperty(AppConstants.BRIDGE, 'ACTIVE', {
        get: () => false,
      });

      supportedChainIds.forEach((chainId) => {
        expect(isBridgeAllowed(chainId)).toBe(false);
      });
    });

    it('should handle invalid chain ID formats', () => {
      const invalidChainIds = ['0x123' as Hex, '0x' as Hex];

      invalidChainIds.forEach((chainId) => {
        expect(isBridgeAllowed(chainId)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      // Test with malformed chain ID
      expect(
        isBridgeAllowed(
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex,
        ),
      ).toBe(false);
    });
  });
});
