import migrate, { migrationVersion } from './152';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

describe(`Migration ${migrationVersion}: Remove mUSD conversion fields from user state`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns state unchanged when ensureValidState fails', () => {
    const invalidState = 'not an object';
    const result = migrate(invalidState);

    expect(result).toBe(invalidState);
  });

  it('returns state unchanged when user property is missing', () => {
    const state = {
      engine: { backgroundState: {} },
      settings: {},
      security: {},
    };

    const result = migrate(state) as typeof state;

    expect(result).toStrictEqual(state);
  });

  it('returns state unchanged when user is not an object', () => {
    const state = {
      engine: { backgroundState: {} },
      settings: {},
      security: {},
      user: 'invalid',
    };

    const result = migrate(state) as typeof state;

    expect(result).toStrictEqual(state);
  });

  it('removes mUSD conversion fields from user state', () => {
    const state = {
      engine: { backgroundState: {} },
      settings: {},
      security: {},
      user: {
        existingUser: true,
        musdConversionEducationSeen: true,
        musdConversionAssetDetailCtasSeen: {
          '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': true,
        },
      },
    };

    const result = migrate(state) as typeof state;
    const user = result.user as Record<string, unknown>;

    expect(user.musdConversionEducationSeen).toBeUndefined();
    expect(user.musdConversionAssetDetailCtasSeen).toBeUndefined();
  });

  it('preserves other user state fields', () => {
    const state = {
      engine: { backgroundState: {} },
      settings: {},
      security: {},
      user: {
        existingUser: true,
        multichainAccountsIntroModalSeen: true,
        moneyOnboardingSeen: true,
        moneyEarnBannerDismissedTokens: { '0x1-0xabc': true },
        musdConversionEducationSeen: true,
        musdConversionAssetDetailCtasSeen: {},
      },
    };

    const result = migrate(state) as typeof state;
    const user = result.user as Record<string, unknown>;

    expect(user.existingUser).toBe(true);
    expect(user.multichainAccountsIntroModalSeen).toBe(true);
    expect(user.moneyOnboardingSeen).toBe(true);
    expect(user.moneyEarnBannerDismissedTokens).toEqual({ '0x1-0xabc': true });
  });

  it('handles user state that already lacks the removed fields', () => {
    const state = {
      engine: { backgroundState: {} },
      settings: {},
      security: {},
      user: {
        existingUser: false,
        moneyOnboardingSeen: false,
      },
    };

    const result = migrate(state) as typeof state;
    const user = result.user as Record<string, unknown>;

    expect(user.existingUser).toBe(false);
    expect(user.moneyOnboardingSeen).toBe(false);
    expect(user.musdConversionEducationSeen).toBeUndefined();
    expect(user.musdConversionAssetDetailCtasSeen).toBeUndefined();
  });

  it('handles empty user object', () => {
    const state = {
      engine: { backgroundState: {} },
      settings: {},
      security: {},
      user: {},
    };

    const result = migrate(state) as typeof state;

    expect(result.user).toEqual({});
  });
});
