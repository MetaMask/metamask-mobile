/**
 * Integration tests — Hyperliquid funds routing per network.
 *
 * perps-controller 22.0.0 routes Hyperliquid testnet funds through USDC2 on
 * Arbitrum Sepolia. Real `HyperLiquidProvider` withdraw validation and the
 * real `PerpsController` deposit preparation run; the shared harness mocks
 * the SDK, wallet and messenger I/O. Route validation is unmocked here
 * because it is the behavior under test.
 *
 * Reference: tests/integration/AGENTS.md · tests/integration/harnesses/perps/perps.ts
 */

import {
  buildPerpsDepositHarness,
  buildPerpsIntegrationHarness,
} from '../../../../../tests/integration/harnesses/perps/perps';
import {
  HYPERLIQUID_ASSET_CONFIGS,
  PERPS_ERROR_CODES,
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_ARBITRUM_TESTNET_ADDRESS,
  getBridgeInfo,
} from '@metamask/perps-controller';
import {
  getSupportedPaths,
  validateAssetSupport,
} from '@metamask/perps-controller/utils/hyperLiquidValidation';

// Circle USDC on Arbitrum Sepolia: the testnet asset before 22.0.0.
const PREVIOUS_TESTNET_USDC_ASSET_ID =
  'eip155:421614/erc20:0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d/default';

const actualValidation = jest.requireActual<{
  getSupportedPaths: typeof getSupportedPaths;
  validateAssetSupport: typeof validateAssetSupport;
}>('@metamask/perps-controller/utils/hyperLiquidValidation');

describe('Perps funds routing — integration', () => {
  beforeEach(() => {
    jest
      .mocked(getSupportedPaths)
      .mockImplementation(actualValidation.getSupportedPaths);
    jest
      .mocked(validateAssetSupport)
      .mockImplementation(actualValidation.validateAssetSupport);
  });

  describe('withdraw', () => {
    it('submits a testnet USDC2 withdrawal', async () => {
      // Arrange
      const { provider, setupTradingReady, mocks } =
        buildPerpsIntegrationHarness({ isTestnet: true });
      setupTradingReady();

      // Act
      const result = await provider.withdraw({
        assetId: HYPERLIQUID_ASSET_CONFIGS.usdc.testnet,
        amount: '10',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mocks.exchangeClient.withdraw3).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '10' }),
      );
    });

    it('rejects the previous testnet USDC asset without submitting', async () => {
      // Arrange
      const { provider, setupTradingReady, mocks } =
        buildPerpsIntegrationHarness({ isTestnet: true });
      setupTradingReady();

      // Act
      const result = await provider.withdraw({
        assetId: PREVIOUS_TESTNET_USDC_ASSET_ID,
        amount: '10',
      });

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: PERPS_ERROR_CODES.WITHDRAW_ASSET_NOT_SUPPORTED,
      });
      expect(mocks.exchangeClient.withdraw3).not.toHaveBeenCalled();
    });

    it('submits a mainnet USDC withdrawal', async () => {
      // Arrange
      const { provider, setupTradingReady, mocks } =
        buildPerpsIntegrationHarness();
      setupTradingReady();

      // Act
      const result = await provider.withdraw({
        assetId: HYPERLIQUID_ASSET_CONFIGS.usdc.mainnet,
        amount: '10',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mocks.exchangeClient.withdraw3).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '10' }),
      );
    });
  });

  describe('deposit preparation', () => {
    it.each([
      {
        network: 'testnet',
        isTestnet: true,
        chainId: '0x66eee',
        token: USDC_ARBITRUM_TESTNET_ADDRESS,
      },
      {
        network: 'mainnet',
        isTestnet: false,
        chainId: '0xa4b1',
        token: USDC_ARBITRUM_MAINNET_ADDRESS,
      },
    ])(
      'adds a $network USDC transfer to the Hyperliquid bridge',
      async ({ isTestnet, chainId, token }) => {
        // Arrange
        const {
          controller,
          addTransaction,
          findNetworkClientIdByChainId,
          networkClientId,
        } = buildPerpsDepositHarness({ isTestnet });
        await controller.init();

        try {
          // Act
          await controller.depositWithConfirmation();

          // Assert
          const bridge = getBridgeInfo(isTestnet).contractAddress;
          expect(findNetworkClientIdByChainId).toHaveBeenCalledWith(chainId);
          expect(addTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
              to: token,
              data: expect.stringContaining(bridge.slice(2).toLowerCase()),
            }),
            expect.objectContaining({
              networkClientId,
              type: 'perpsDeposit',
            }),
          );
        } finally {
          await controller.disconnect();
        }
      },
    );
  });
});
