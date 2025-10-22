import '../_mocks_/initialState';
import { isBridgeAllowed, wipeBridgeStatus, getTokenIconUrl } from './index';
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
import { SolScope } from '@metamask/keyring-api';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/AppConstants', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../core/AppConstants'),
  BRIDGE: {
    ACTIVE: true,
  },
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    BridgeStatusController: {
      wipeBridgeStatus: jest.fn(),
    },
  },
}));

const mockWipeBridgeStatus = Engine.context.BridgeStatusController
  .wipeBridgeStatus as jest.MockedFunction<
  typeof Engine.context.BridgeStatusController.wipeBridgeStatus
>;

describe('Bridge Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  describe('wipeBridgeStatus', () => {
    const testAddress = '0x742C3cF9Af45f91B109a81EfEaf11535ECDe9571';
    const testAddressLowercase = testAddress.toLowerCase();
    const evmChainId = ETH_CHAIN_ID;

    it('should call wipeBridgeStatus twice for EVM chains (original and lowercase address)', () => {
      wipeBridgeStatus(testAddress, evmChainId);

      expect(mockWipeBridgeStatus).toHaveBeenCalledTimes(2);
      expect(mockWipeBridgeStatus).toHaveBeenNthCalledWith(1, {
        address: testAddress,
        ignoreNetwork: false,
      });
      expect(mockWipeBridgeStatus).toHaveBeenNthCalledWith(2, {
        address: testAddressLowercase,
        ignoreNetwork: false,
      });
    });

    it('should call wipeBridgeStatus only once for Solana chains (original address only)', () => {
      wipeBridgeStatus(testAddress, SolScope.Mainnet);

      expect(mockWipeBridgeStatus).toHaveBeenCalledTimes(1);
      expect(mockWipeBridgeStatus).toHaveBeenCalledWith({
        address: testAddress,
        ignoreNetwork: false,
      });
    });
  });

  describe('getTokenIconUrl', () => {
    it('should return token icon URL for native token on Ethereum', () => {
      // Arrange
      const nativeTokenAddress = '0x0000000000000000000000000000000000000000';

      // Act
      const result = getTokenIconUrl(nativeTokenAddress, ETH_CHAIN_ID);

      // Assert
      expect(result).toBe(
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
      );
    });

    it('should return token icon URL for ERC20 token on Ethereum', () => {
      // Arrange
      const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

      // Act
      const result = getTokenIconUrl(usdcAddress, ETH_CHAIN_ID);

      // Assert
      expect(result).toBe(
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
      );
    });

    it('should return token icon URL for Solana native token', () => {
      // Arrange
      const solNativeAddress = '0x0000000000000000000000000000000000000000';

      // Act
      const result = getTokenIconUrl(solNativeAddress, SolScope.Mainnet);

      // Assert
      expect(result).toBe(
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
      );
    });

    it('should return token icon URL for Solana SPL token', () => {
      // Arrange
      const usdcSolanaAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      // Act
      const result = getTokenIconUrl(usdcSolanaAddress, SolScope.Mainnet);

      // Assert
      expect(result).toBe(
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
      );
    });

    it('should return undefined for invalid address', () => {
      // Arrange
      const invalidAddress = 'invalid';

      // Act
      const result = getTokenIconUrl(invalidAddress, ETH_CHAIN_ID);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return native token icon URL for empty address', () => {
      // Arrange
      const emptyAddress = '';

      // Act
      const result = getTokenIconUrl(emptyAddress, ETH_CHAIN_ID);

      // Assert
      expect(result).toBe(
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
      );
    });
  });
});
