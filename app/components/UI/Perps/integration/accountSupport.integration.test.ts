/**
 * Integration test — Core owns the Hyperliquid multisig support decision while
 * Mobile mocks only the venue lookup.
 */

import { buildPerpsAccountSupportHarness } from '../../../../../tests/integration/harnesses/perps/perps';

describe('Perps account support — integration', () => {
  it('supports a regular Hyperliquid account', async () => {
    const { controller, infoClient } = buildPerpsAccountSupportHarness();
    await controller.init();

    try {
      const support = await controller.getAccountSupport({
        providerId: 'hyperliquid',
      });

      expect(support).toStrictEqual({ isSupported: true });
      expect(infoClient.userToMultiSigSigners).toHaveBeenCalledTimes(1);
    } finally {
      await controller.disconnect();
    }
  });

  it('rejects a Hyperliquid-native multisig account', async () => {
    const { controller, infoClient } = buildPerpsAccountSupportHarness();
    infoClient.userToMultiSigSigners.mockResolvedValue({} as never);
    await controller.init();

    try {
      const support = await controller.getAccountSupport({
        providerId: 'hyperliquid',
      });

      expect(support).toStrictEqual({
        isSupported: false,
        reason: 'multi_sig_account',
      });
      expect(infoClient.userToMultiSigSigners).toHaveBeenCalledTimes(1);
    } finally {
      await controller.disconnect();
    }
  });
});
