import migrate, { migrationVersion } from './124';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

describe(`Migration ${migrationVersion}: Remove stale cache and priority token fields from Card state`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns state unchanged when ensureValidState fails', () => {
    const invalidState = 'not an object';
    const result = migrate(invalidState);

    expect(result).toBe(invalidState);
  });

  it('returns state unchanged when card property is missing', () => {
    const state = {
      engine: { backgroundState: {} },
      settings: {},
      security: {},
    };

    const result = migrate(state) as typeof state;

    expect(result).toStrictEqual(state);
  });

  it('returns state unchanged when card is not an object', () => {
    const state = {
      engine: { backgroundState: {} },
      settings: {},
      security: {},
      card: 'invalid',
    };

    const result = migrate(state) as typeof state;

    expect(result).toStrictEqual(state);
  });

  it('removes stale fields from card state', () => {
    const state = {
      engine: { backgroundState: {} },
      settings: {},
      security: {},
      card: {
        cardholderAccounts: ['0x123'],
        isLoaded: true,
        hasViewedCardButton: true,
        alwaysShowCardButton: false,
        geoLocation: 'US',
        isAuthenticated: false,
        userCardLocation: 'international',
        isDaimoDemo: false,
        onboarding: {
          onboardingId: null,
          selectedCountry: null,
          contactVerificationId: null,
          consentSetId: null,
        },
        cache: {
          data: { 'some-key': { value: 'test' } },
          timestamps: { 'some-key': 1000 },
        },
        priorityTokensByAddress: {
          '0x123': { address: '0xToken1', symbol: 'USDC' },
        },
        lastFetchedByAddress: {
          '0x123': '2025-08-21T10:00:00Z',
        },
        authenticatedPriorityToken: {
          address: '0xToken1',
          symbol: 'USDC',
        },
        authenticatedPriorityTokenLastFetched: '2025-08-21T10:00:00Z',
      },
    };

    const result = migrate(state) as typeof state;
    const card = result.card as Record<string, unknown>;

    expect(card.cache).toBeUndefined();
    expect(card.priorityTokensByAddress).toBeUndefined();
    expect(card.lastFetchedByAddress).toBeUndefined();
    expect(card.authenticatedPriorityToken).toBeUndefined();
    expect(card.authenticatedPriorityTokenLastFetched).toBeUndefined();
  });

  it('preserves other card state fields', () => {
    const state = {
      engine: { backgroundState: {} },
      settings: {},
      security: {},
      card: {
        cardholderAccounts: ['0x123', '0x456'],
        isLoaded: true,
        hasViewedCardButton: true,
        alwaysShowCardButton: true,
        geoLocation: 'GB',
        isAuthenticated: true,
        userCardLocation: 'us',
        isDaimoDemo: false,
        onboarding: {
          onboardingId: 'test-id',
          selectedCountry: { key: 'US', name: 'United States', emoji: '🇺🇸' },
          contactVerificationId: 'ver-123',
          consentSetId: 'consent-456',
        },
        cache: { data: {}, timestamps: {} },
        priorityTokensByAddress: {},
        lastFetchedByAddress: {},
        authenticatedPriorityToken: null,
        authenticatedPriorityTokenLastFetched: null,
      },
    };

    const result = migrate(state) as typeof state;
    const card = result.card as Record<string, unknown>;

    expect(card.cardholderAccounts).toEqual(['0x123', '0x456']);
    expect(card.isLoaded).toBe(true);
    expect(card.hasViewedCardButton).toBe(true);
    expect(card.alwaysShowCardButton).toBe(true);
    expect(card.geoLocation).toBe('GB');
    expect(card.isAuthenticated).toBe(true);
    expect(card.userCardLocation).toBe('us');
    expect(card.isDaimoDemo).toBe(false);
    expect(card.onboarding).toEqual({
      onboardingId: 'test-id',
      selectedCountry: { key: 'US', name: 'United States', emoji: '🇺🇸' },
      contactVerificationId: 'ver-123',
      consentSetId: 'consent-456',
    });
  });

  it('handles card state that already lacks the removed fields', () => {
    const state = {
      engine: { backgroundState: {} },
      settings: {},
      security: {},
      card: {
        cardholderAccounts: [],
        isLoaded: false,
        hasViewedCardButton: false,
        alwaysShowCardButton: false,
        geoLocation: 'UNKNOWN',
        isAuthenticated: false,
        userCardLocation: 'international',
        isDaimoDemo: false,
        onboarding: {
          onboardingId: null,
          selectedCountry: null,
          contactVerificationId: null,
          consentSetId: null,
        },
      },
    };

    const result = migrate(state) as typeof state;
    const card = result.card as Record<string, unknown>;

    expect(card.cardholderAccounts).toEqual([]);
    expect(card.isLoaded).toBe(false);
    expect(card.cache).toBeUndefined();
    expect(card.priorityTokensByAddress).toBeUndefined();
    expect(card.lastFetchedByAddress).toBeUndefined();
    expect(card.authenticatedPriorityToken).toBeUndefined();
    expect(card.authenticatedPriorityTokenLastFetched).toBeUndefined();
  });

  it('handles empty card object', () => {
    const state = {
      engine: { backgroundState: {} },
      settings: {},
      security: {},
      card: {},
    };

    const result = migrate(state) as typeof state;

    expect(result.card).toEqual({});
  });
});
