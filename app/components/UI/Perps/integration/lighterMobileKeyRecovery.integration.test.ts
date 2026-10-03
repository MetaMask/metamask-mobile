import { buildLighterMobileKeyRecoveryHarness } from '../../../../../tests/integration/harnesses/perps/lighter-mobile-key-recovery';

describe('Mobile Lighter software key recovery', () => {
  it('reuses the registered derived key beside unreadable legacy storage across reconnects', async () => {
    const perps = buildLighterMobileKeyRecoveryHarness();
    try {
      await perps.controller.init();

      const initial = await perps.controller.reviewRecoveryVenue({
        providerId: 'lighter',
      });
      perps.reconnectSigner();
      const reconnected = await perps.controller.reviewRecoveryVenue({
        providerId: 'lighter',
      });

      expect(initial).toMatchObject({ status: 'ready' });
      expect(reconnected).toMatchObject({ status: 'ready' });
      expect(perps.native.getSecureItem).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'com.metamask.PERPS_LIGHTER_SIGNER.300.28.2',
        }),
      );
      expect(
        perps.native.executor.mock.calls
          .filter(([call]) => call.function === '_createAuthToken')
          .map(([call]) => call.params),
      ).toEqual([
        [28, 3],
        [28, 3],
      ]);
      expect(perps.native.setSecureItem).not.toHaveBeenCalled();
      expect(perps.mocks.signPersonalMessage).not.toHaveBeenCalled();
      expect(
        perps.requests.some((url) => url.pathname === '/api/v1/sendTx'),
      ).toBe(false);
    } finally {
      await perps.teardown();
    }
  });
});
