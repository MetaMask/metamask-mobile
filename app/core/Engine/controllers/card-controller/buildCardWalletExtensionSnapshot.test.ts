import {
  BAANX_APPLE_PAY_FLAG_KEY,
  decideCardWalletExtensionSnapshot,
  type SnapshotInput,
} from './buildCardWalletExtensionSnapshot';

const baseInput = (): SnapshotInput => ({
  providerId: 'baanx',
  providerUserId: 'user-1',
  location: 'us',
  applePayEnabled: true,
  applePayCapability: true,
  cardHomeData: {
    card: { id: 'card-1', lastFour: '4242' },
    walletProvisioning: {
      eligible: true,
      cardholderName: 'Ada Lovelace',
      lastFour: '4242',
    },
  },
  apiBaseUrl: 'https://api.baanx.com',
  baanxClientKey: 'client-key',
  flagsUrl: 'https://client-config.api.cx.metamask.io/v1/flags?client=mobile',
  flagKey: BAANX_APPLE_PAY_FLAG_KEY,
  appVersion: '8.15.0',
  now: 100,
});

describe('decideCardWalletExtensionSnapshot', () => {
  it('publishes a Baanx US card', () => {
    const decision = decideCardWalletExtensionSnapshot(baseInput());
    expect(decision.action).toBe('write');
    if (decision.action !== 'write') return;
    expect(decision.snapshot.cards[0]).toMatchObject({
      entryId: 'card-1',
      lastFour: '4242',
      cardholderName: 'Ada Lovelace',
    });
    expect(decision.snapshot.baanxClientKey).toBe('client-key');
    expect(decision.snapshot.cards[0].primaryAccountIdentifier).toBeUndefined();
  });

  it('clears Baanx cards that are not in the US', () => {
    const decision = decideCardWalletExtensionSnapshot({
      ...baseInput(),
      location: 'international',
    });
    expect(decision).toEqual({ action: 'clear' });
  });

  it('clears when the flag or capability is off', () => {
    expect(
      decideCardWalletExtensionSnapshot({
        ...baseInput(),
        applePayEnabled: false,
      }),
    ).toEqual({ action: 'clear' });
    expect(
      decideCardWalletExtensionSnapshot({
        ...baseInput(),
        applePayCapability: false,
      }),
    ).toEqual({ action: 'clear' });
  });

  it('keeps the last snapshot when card home data is gone', () => {
    expect(
      decideCardWalletExtensionSnapshot({
        ...baseInput(),
        cardHomeData: null,
      }),
    ).toEqual({ action: 'keep' });
  });

  it('uses the Immersve series id as the entry id', () => {
    const decision = decideCardWalletExtensionSnapshot({
      ...baseInput(),
      providerId: 'immersve',
      location: 'international',
      immersveClientApplicationId: 'app-id',
      immersveAppUrl: 'https://metamask.app.link',
      cardHomeData: {
        card: { id: 'card-9', lastFour: '1111' },
        walletProvisioning: {
          eligible: true,
          cardholderName: 'Grace',
          lastFour: '1111',
          primaryAccountIdentifier: 'series-9',
        },
      },
    });
    expect(decision.action).toBe('write');
    if (decision.action !== 'write') return;
    expect(decision.snapshot.cards[0].entryId).toBe('series-9');
    expect(decision.snapshot.cards[0].primaryAccountIdentifier).toBe(
      'series-9',
    );
  });
});
