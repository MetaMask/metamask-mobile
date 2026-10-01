/** Integration coverage for Mobile's recovery actions through installed Core. */
import { buildLighterRecoveryHarness } from '../../../../../tests/integration/harnesses/perps/lighter-recovery';
import { waitFor } from '@testing-library/react-native';

const OTHER_WALLET = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

describe('Lighter authoritative recovery review', () => {
  it('reads the selected wallet venue state without registering or submitting a key', async () => {
    const perps = buildLighterRecoveryHarness();
    try {
      await perps.controller.init();
      const result = await perps.controller.reviewRecoveryVenue({
        providerId: 'lighter',
      });

      expect(result).toMatchObject({
        status: 'ready',
        providerId: 'lighter',
        walletAddress: perps.walletAddress,
        network: 'testnet',
        accountIndex: perps.accountIndex,
        positions: [],
        orders: [],
      });
      expect(perps.mocks.signPersonalMessage).not.toHaveBeenCalled();
      expect(
        perps.mocks.execute.mock.calls.map(([call]) => call.function),
      ).toEqual(['_createAuthToken']);
      expect(
        perps.requests.some((url) => url.pathname === '/api/v1/sendTx'),
      ).toBe(false);
    } finally {
      await perps.teardown();
    }
  });

  it('refuses a registered key that differs from the locally restored signer', async () => {
    const perps = buildLighterRecoveryHarness();
    perps.responses.set('/api/v1/apikeys', {
      code: 200,
      apiKeys: [
        {
          accountIndex: perps.accountIndex,
          apiKeyIndex: perps.apiKeyIndex,
          nonce: 0,
          publicKey: '77'.repeat(40),
        },
      ],
    });
    try {
      await perps.controller.init();
      await expect(
        perps.controller.reviewRecoveryVenue({ providerId: 'lighter' }),
      ).rejects.toThrow(/matching locally retained registered key/u);

      expect(perps.mocks.execute).not.toHaveBeenCalled();
      expect(perps.mocks.signPersonalMessage).not.toHaveBeenCalled();
      expect(
        perps.requests.some((url) => url.pathname === '/api/v1/sendTx'),
      ).toBe(false);
    } finally {
      await perps.teardown();
    }
  });

  it('returns the position and protection order in canonical client types', async () => {
    const perps = buildLighterRecoveryHarness();
    perps.responses.set('/api/v1/account', {
      code: 200,
      accounts: [
        {
          ...perps.accountFixture,
          positions: [
            {
              marketId: 1,
              symbol: 'BTC',
              initialMarginFraction: '200',
              openOrderCount: 1,
              sign: 1,
              position: '0.0002',
              avgEntryPrice: '100000',
              positionValue: '20',
              unrealizedPnl: '0.5',
              realizedPnl: '0',
              liquidationPrice: '80000',
            },
          ],
        },
      ],
    });
    perps.responses.set('/api/v1/orderBookDetails', {
      code: 200,
      orderBookDetails: [
        {
          symbol: 'BTC',
          marketId: 1,
          marketType: 'perp',
          status: 'active',
          takerFee: '0',
          makerFee: '0',
          minBaseAmount: '0.0002',
          minQuoteAmount: '10',
          supportedSizeDecimals: 5,
          supportedPriceDecimals: 1,
          supportedQuoteDecimals: 6,
          lastTradePrice: 100000,
          minInitialMarginFraction: 200,
          dailyTradesCount: 1,
          dailyBaseTokenVolume: 1,
          dailyQuoteTokenVolume: 100000,
          dailyPriceLow: 99000,
          dailyPriceHigh: 101000,
          dailyPriceChange: 1,
          openInterest: 1,
          dailyChart: {},
        },
      ],
    });
    perps.responses.set('/api/v1/accountActiveOrders', {
      code: 200,
      orders: [
        {
          orderIndex: 41,
          clientOrderIndex: 141,
          marketIndex: 1,
          ownerAccountIndex: perps.accountIndex,
          initialBaseAmount: '0.0002',
          remainingBaseAmount: '0.0002',
          price: '115500',
          isAsk: true,
          type: 'take-profit',
          timeInForce: 'immediate-or-cancel',
          reduceOnly: true,
          status: 'open',
          orderExpiry: 0,
          timestamp: 1790800000,
          triggerPrice: '110000',
        },
      ],
    });
    try {
      await perps.controller.init();
      const result = await perps.controller.reviewRecoveryVenue({
        providerId: 'lighter',
      });

      expect(result).toMatchObject({
        status: 'ready',
        positions: [
          {
            symbol: 'BTC',
            size: '0.0002',
            entryPrice: '100000',
            providerId: 'lighter',
          },
        ],
        orders: [
          {
            orderId: '41',
            symbol: 'BTC',
            size: '0.0002',
            triggerOrderType: 'take_profit_market',
            triggerPrice: '110000',
            reduceOnly: true,
            providerId: 'lighter',
          },
        ],
      });
      expect(perps.mocks.signPersonalMessage).not.toHaveBeenCalled();
      expect(
        perps.requests.some((url) => url.pathname === '/api/v1/sendTx'),
      ).toBe(false);
    } finally {
      await perps.teardown();
    }
  });

  it('refuses unavailable order data instead of reviewing an assumed empty account', async () => {
    const perps = buildLighterRecoveryHarness();
    perps.responses.set('/api/v1/accountActiveOrders', { code: 200 });
    try {
      await perps.controller.init();
      await expect(
        perps.controller.reviewRecoveryVenue({ providerId: 'lighter' }),
      ).rejects.toThrow(/orders/u);

      expect(perps.mocks.signPersonalMessage).not.toHaveBeenCalled();
    } finally {
      await perps.teardown();
    }
  });

  it('refuses account data owned by a different Ethereum wallet', async () => {
    const perps = buildLighterRecoveryHarness();
    perps.responses.set('/api/v1/account', {
      code: 200,
      accounts: [{ ...perps.accountFixture, l1Address: OTHER_WALLET }],
    });
    try {
      await perps.controller.init();
      await expect(
        perps.controller.reviewRecoveryVenue({ providerId: 'lighter' }),
      ).rejects.toThrow(/identity/u);

      expect(perps.mocks.signPersonalMessage).not.toHaveBeenCalled();
    } finally {
      await perps.teardown();
    }
  });

  it('refuses a late venue read after the selected wallet changes', async () => {
    const perps = buildLighterRecoveryHarness();
    let completeOrders: (value: unknown) => void = () => undefined;
    const pendingOrders = new Promise<unknown>((resolve) => {
      completeOrders = resolve;
    });
    perps.responses.set('/api/v1/accountActiveOrders', pendingOrders);
    try {
      await perps.controller.init();
      const review = perps.controller.reviewRecoveryVenue({
        providerId: 'lighter',
      });
      const completion = review.catch((error: unknown) => error);
      await waitFor(() =>
        expect(
          perps.requests.some(
            (url) => url.pathname === '/api/v1/accountActiveOrders',
          ),
        ).toBe(true),
      );

      perps.selectAccount(OTHER_WALLET);
      completeOrders({ code: 200, orders: [] });
      expect(await completion).toMatchObject({
        name: 'LighterSessionCancelledError',
      });

      expect(perps.mocks.signPersonalMessage).not.toHaveBeenCalled();
      expect(
        perps.requests.some((url) => url.pathname === '/api/v1/sendTx'),
      ).toBe(false);
    } finally {
      completeOrders({ code: 200, orders: [] });
      await perps.teardown();
    }
  });

  it('expires an old review after account A switches to B and back to A', async () => {
    const perps = buildLighterRecoveryHarness();
    let completeOrders: (value: unknown) => void = () => undefined;
    const pendingOrders = new Promise<unknown>((resolve) => {
      completeOrders = resolve;
    });
    perps.responses.set('/api/v1/accountActiveOrders', pendingOrders);
    try {
      await perps.controller.init();
      const original = perps.controller
        .reviewRecoveryVenue({ providerId: 'lighter' })
        .catch((error: unknown) => error);
      await waitFor(() =>
        expect(
          perps.requests.some(
            (url) => url.pathname === '/api/v1/accountActiveOrders',
          ),
        ).toBe(true),
      );
      const priorLookups = perps.requests.filter(
        (url) => url.pathname === '/api/v1/accountsByL1Address',
      ).length;

      perps.selectAccount(OTHER_WALLET);
      const intermediate = perps.controller
        .reviewRecoveryVenue({ providerId: 'lighter' })
        .catch((error: unknown) => error);
      await waitFor(() =>
        expect(
          perps.requests.filter(
            (url) => url.pathname === '/api/v1/accountsByL1Address',
          ).length,
        ).toBeGreaterThan(priorLookups),
      );
      perps.selectAccount(perps.walletAddress);
      completeOrders({ code: 200, orders: [] });

      expect(await original).toMatchObject({
        name: 'LighterSessionCancelledError',
      });
      expect(await intermediate).toMatchObject({
        name: 'LighterSessionCancelledError',
      });
      perps.responses.delete('/api/v1/accountActiveOrders');
      const current = await perps.controller.reviewRecoveryVenue({
        providerId: 'lighter',
      });
      expect(current).toMatchObject({
        status: 'ready',
        walletAddress: perps.walletAddress,
        network: 'testnet',
        orders: [],
      });
      expect(perps.mocks.signPersonalMessage).not.toHaveBeenCalled();
      expect(
        perps.requests.some((url) => url.pathname === '/api/v1/sendTx'),
      ).toBe(false);
    } finally {
      completeOrders({ code: 200, orders: [] });
      await perps.teardown();
    }
  });

  it('expires a testnet review when the real controller changes networks', async () => {
    const perps = buildLighterRecoveryHarness();
    let completeOrders: (value: unknown) => void = () => undefined;
    const pendingOrders = new Promise<unknown>((resolve) => {
      completeOrders = resolve;
    });
    perps.responses.set('/api/v1/accountActiveOrders', pendingOrders);
    try {
      await perps.controller.init();
      const original = perps.controller
        .reviewRecoveryVenue({ providerId: 'lighter' })
        .catch((error: unknown) => error);
      await waitFor(() =>
        expect(
          perps.requests.some(
            (url) => url.pathname === '/api/v1/accountActiveOrders',
          ),
        ).toBe(true),
      );

      const switched = await perps.controller.toggleTestnet();
      completeOrders({ code: 200, orders: [] });

      expect(switched).toMatchObject({ success: true, isTestnet: false });
      expect(await original).toMatchObject({
        name: 'LighterSessionCancelledError',
      });
      perps.responses.delete('/api/v1/accountActiveOrders');
      const current = await perps.controller.reviewRecoveryVenue({
        providerId: 'lighter',
      });
      expect(current).toMatchObject({
        status: 'ready',
        walletAddress: perps.walletAddress,
        network: 'mainnet',
      });
      expect(perps.mocks.signPersonalMessage).not.toHaveBeenCalled();
      expect(
        perps.requests.some((url) => url.pathname === '/api/v1/sendTx'),
      ).toBe(false);
    } finally {
      completeOrders({ code: 200, orders: [] });
      await perps.teardown();
    }
  });
});
