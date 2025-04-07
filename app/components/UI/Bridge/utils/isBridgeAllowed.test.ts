import isBridgeAllowed from './isBridgeAllowed';
import AppConstants from '../../../../core/AppConstants';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';
import { BtcScope, SolScope } from '@metamask/keyring-api';

// Mock AppConstants
jest.mock('../../../../core/AppConstants', () => ({
  BRIDGE: {
    ACTIVE: true,
  },
}));

describe('isBridgeAllowed', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const {
    MAINNET,
    OPTIMISM,
    BSC,
    POLYGON,
    ZKSYNC_ERA: ZKSYNC,
    BASE,
    ARBITRUM,
    AVAXCCHAIN: AVALANCHE,
    LINEA_MAINNET: LINEA,
  } = NETWORKS_CHAIN_ID;

  describe('when BRIDGE.ACTIVE is false', () => {
    beforeEach(() => {
      (AppConstants.BRIDGE.ACTIVE as boolean) = false;
    });

    it('should return false for any chain ID', () => {
      expect(isBridgeAllowed(MAINNET)).toBe(false);
      expect(isBridgeAllowed(OPTIMISM)).toBe(false);
      expect(isBridgeAllowed('0x999')).toBe(false);
    });
  });

  describe('when BRIDGE.ACTIVE is true', () => {
    beforeEach(() => {
      (AppConstants.BRIDGE.ACTIVE as boolean) = true;
    });

    it('should return true for allowed chain IDs', () => {
      expect(isBridgeAllowed(MAINNET)).toBe(true);
      expect(isBridgeAllowed(OPTIMISM)).toBe(true);
      expect(isBridgeAllowed(BSC)).toBe(true);
      expect(isBridgeAllowed(POLYGON)).toBe(true);
      expect(isBridgeAllowed(ZKSYNC)).toBe(true);
      expect(isBridgeAllowed(BASE)).toBe(true);
      expect(isBridgeAllowed(ARBITRUM)).toBe(true);
      expect(isBridgeAllowed(AVALANCHE)).toBe(true);
      expect(isBridgeAllowed(LINEA)).toBe(true);
    });

    it('should return false for non-allowed chain IDs', () => {
      expect(isBridgeAllowed('0x999')).toBe(false);
      expect(isBridgeAllowed('0x123')).toBe(false);
    });

    it('should return false for Bitcoin mainnet', () => {
      expect(isBridgeAllowed(BtcScope.Mainnet)).toBe(false);
    });

    describe('Solana mainnet handling', () => {
      it('should return false for Solana mainnet when MM_BRIDGE_UI_ENABLED is false', () => {
        process.env.MM_BRIDGE_UI_ENABLED = 'false';
        expect(isBridgeAllowed(SolScope.Mainnet)).toBe(false);
      });

      it('should return false for Solana mainnet when MM_BRIDGE_UI_ENABLED is undefined', () => {
        process.env.MM_BRIDGE_UI_ENABLED = undefined;
        expect(isBridgeAllowed(SolScope.Mainnet)).toBe(false);
      });
    });
  });
});
