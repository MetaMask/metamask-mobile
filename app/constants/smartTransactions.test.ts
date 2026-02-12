import { NETWORKS_CHAIN_ID } from './network';
import { isProduction } from '../util/environment';
import {
  getAllowedSmartTransactionsChainIds,
  sanitizeOrigin,
} from './smartTransactions';

jest.mock('../util/environment', () => ({
  isProduction: jest.fn(() => false), // Initially mock isProduction to return false
}));

// Cast isProduction to jest.Mock to inform TypeScript about the mock type
const mockIsProduction = isProduction as jest.Mock;

describe('smartTransactions', () => {
  describe('getAllowedSmartTransactionsChainIds', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns the correct chain IDs for development environment', () => {
      mockIsProduction.mockReturnValue(false);
      const allowedChainIds = getAllowedSmartTransactionsChainIds();
      expect(allowedChainIds).toStrictEqual([
        NETWORKS_CHAIN_ID.MAINNET,
        NETWORKS_CHAIN_ID.SEPOLIA,
        NETWORKS_CHAIN_ID.BASE,
        NETWORKS_CHAIN_ID.LINEA_MAINNET,
        NETWORKS_CHAIN_ID.BSC,
        NETWORKS_CHAIN_ID.ARBITRUM,
        NETWORKS_CHAIN_ID.POLYGON,
      ]);
    });

    it('returns the correct chain IDs for production environment', () => {
      mockIsProduction.mockReturnValue(true);
      const allowedChainIds = getAllowedSmartTransactionsChainIds();
      expect(allowedChainIds).toStrictEqual([
        NETWORKS_CHAIN_ID.MAINNET,
        NETWORKS_CHAIN_ID.BASE,
        NETWORKS_CHAIN_ID.LINEA_MAINNET,
        NETWORKS_CHAIN_ID.BSC,
        NETWORKS_CHAIN_ID.ARBITRUM,
        NETWORKS_CHAIN_ID.POLYGON,
      ]);
    });
  });

  describe('sanitizeOrigin', () => {
    it('extracts hostname from URL with path', () => {
      expect(sanitizeOrigin('https://uniswap.org/swap?token=0x123')).toBe(
        'uniswap.org',
      );
    });

    it('extracts hostname from URL with subdomain', () => {
      expect(sanitizeOrigin('https://app.aave.com/#/markets')).toBe(
        'app.aave.com',
      );
    });

    it('extracts hostname from URL with port', () => {
      expect(sanitizeOrigin('http://localhost:3000/test')).toBe('localhost');
    });

    it('returns internal origin as-is', () => {
      expect(sanitizeOrigin('metamask')).toBe('metamask');
    });

    it('returns MetaMask Mobile origin as-is', () => {
      expect(sanitizeOrigin('MetaMask Mobile')).toBe('MetaMask Mobile');
    });

    it('returns RAMPS_SEND origin as-is', () => {
      expect(sanitizeOrigin('RAMPS_SEND')).toBe('RAMPS_SEND');
    });

    it('returns WalletConnect origin as-is', () => {
      expect(sanitizeOrigin('wc::')).toBe('wc::');
    });

    it('returns SDK origin as-is', () => {
      expect(sanitizeOrigin('MMSDKREMOTE::abc123')).toBe('MMSDKREMOTE::abc123');
    });

    it('returns undefined for undefined input', () => {
      expect(sanitizeOrigin(undefined)).toBeUndefined();
    });

    it('returns empty string for empty string input', () => {
      expect(sanitizeOrigin('')).toBeUndefined();
    });
  });
});
