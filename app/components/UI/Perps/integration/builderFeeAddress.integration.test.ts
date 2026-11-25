/**
 * Integration test — RWDS-1675 (plan row L3): the Perps builder fee address.
 *
 * Terminal (Perps) must trade under the configured Hyperliquid mainnet
 * builder address, and Rewards fee attribution must agree with it: the grant
 * the backend issues carries that same builder code, and
 * `RewardsController.getPerpsTradingFeeGrant` refuses a grant whose builder
 * code names a different builder. A drift between the address the client
 * sends and the address the matcher accepts would drop the fee grant — or
 * attribute mobile volume to the wrong builder — so this exercises the real
 * client config and the real controller matcher over one shared source.
 */

import {
  TERMINAL_BUILDER_ADDRESS,
  buildRewardsMoneyBuilderFeeHarness,
  tradingFeeGrantResponse,
} from '../../../../../tests/integration/harnesses/rewards-money-builder-fee';

describe('Perps builder fee address — integration', () => {
  it('supplies the configured mainnet builder address to both the client and the grant matcher', async () => {
    // Arrange
    const harness = buildRewardsMoneyBuilderFeeHarness();
    try {
      harness.messenger.call.mockResolvedValue(
        tradingFeeGrantResponse(harness.configuredBuilderAddress),
      );

      // Act
      const grant = await harness.rewardsController.getPerpsTradingFeeGrant({
        providerId: 'hyperliquid',
        isTestnet: false,
      });

      // Assert — one configured source feeds both sides, and the default is
      // the mobile builder address, never Terminal's (RWDS-1675).
      expect(
        harness.clientConfig.providerCredentials?.hyperliquid
          ?.builderAddressMainnet,
      ).toBe(harness.configuredBuilderAddress);
      expect(harness.configuredBuilderAddress).toBe(
        harness.clientConfig.providerCredentials?.hyperliquid
          ?.builderAddressMainnet,
      );
      expect(harness.configuredBuilderAddress.toLowerCase()).not.toBe(
        TERMINAL_BUILDER_ADDRESS,
      );
      expect(grant).toEqual(
        expect.objectContaining({ feeBips: 2.5, isTestnet: false }),
      );
    } finally {
      harness.restoreEnvironment();
    }
  });

  it('returns no grant for a backend grant naming the Terminal builder', async () => {
    // Arrange
    const harness = buildRewardsMoneyBuilderFeeHarness();
    try {
      harness.messenger.call.mockResolvedValue(
        tradingFeeGrantResponse(TERMINAL_BUILDER_ADDRESS),
      );

      // Act
      const grant = await harness.rewardsController.getPerpsTradingFeeGrant({
        providerId: 'hyperliquid',
        isTestnet: false,
      });

      // Assert
      expect(grant).toBeNull();
    } finally {
      harness.restoreEnvironment();
    }
  });

  it('moves both the client address and the grant matcher to the mainnet override', async () => {
    // Arrange
    const override = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const harness = buildRewardsMoneyBuilderFeeHarness({
      mainnetBuilderAddressOverride: override,
    });
    try {
      harness.messenger.call.mockResolvedValue(
        tradingFeeGrantResponse(override),
      );

      // Act
      const grant = await harness.rewardsController.getPerpsTradingFeeGrant({
        providerId: 'hyperliquid',
        isTestnet: false,
      });

      // Assert
      expect(
        harness.clientConfig.providerCredentials?.hyperliquid
          ?.builderAddressMainnet,
      ).toBe(override);
      expect(harness.configuredBuilderAddress).toBe(override);
      expect(grant).toEqual(expect.objectContaining({ feeBips: 2.5 }));
    } finally {
      harness.restoreEnvironment();
    }
  });

  it('refuses the previous builder address once the mainnet override is configured', async () => {
    // Arrange — a fresh controller, so the grant cache does not carry the
    // previous match over.
    const override = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const harness = buildRewardsMoneyBuilderFeeHarness({
      mainnetBuilderAddressOverride: override,
    });
    try {
      harness.messenger.call.mockResolvedValue(
        tradingFeeGrantResponse('0xe95a5e31904e005066614247d309e00d8ad753aa'),
      );

      // Act
      const grant = await harness.rewardsController.getPerpsTradingFeeGrant({
        providerId: 'hyperliquid',
        isTestnet: false,
      });

      // Assert
      expect(grant).toBeNull();
    } finally {
      harness.restoreEnvironment();
    }
  });
});
