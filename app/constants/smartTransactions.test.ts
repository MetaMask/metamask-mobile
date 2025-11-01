import { NETWORKS_CHAIN_ID } from './network';
import { isProduction } from '../util/environment';
import { getAllowedSmartTransactionsChainIds } from './smartTransactions';

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
      ]);
    });
  });
});
