import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './153';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

interface TestState {
  banners?: {
    dismissedBanners?: string[];
    lastDismissedBrazeBanner?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

describe(`Migration ${migrationVersion}: Remove lastDismissedBrazeBanner from banners slice`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports the expected migration version', () => {
    expect(migrationVersion).toBe(153);
  });

  it('returns state unchanged if ensureValidState returns false', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('returns state unchanged if banners slice is missing', () => {
    const state = { engine: {} };

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('returns state unchanged if lastDismissedBrazeBanner is already absent', () => {
    const state: TestState = {
      banners: {
        dismissedBanners: ['some-banner'],
      },
    };

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('removes lastDismissedBrazeBanner and keeps dismissedBanners', () => {
    const state: TestState = {
      banners: {
        dismissedBanners: ['carousel-banner'],
        lastDismissedBrazeBanner: 'campaign-xyz',
      },
      preserved: true,
    };

    const result = migrate(state) as TestState;

    expect(result).toStrictEqual({
      banners: {
        dismissedBanners: ['carousel-banner'],
      },
      preserved: true,
    });
    expect(result.banners).not.toHaveProperty('lastDismissedBrazeBanner');
  });

  it('removes lastDismissedBrazeBanner when the value is already null', () => {
    const state: TestState = {
      banners: {
        dismissedBanners: [],
        lastDismissedBrazeBanner: null,
      },
    };

    const result = migrate(state) as TestState;

    expect(result.banners).toStrictEqual({
      dismissedBanners: [],
    });
  });

  it('captures exceptions and returns state on unexpected errors', () => {
    const banners = new Proxy({} as Record<string, unknown>, {
      get(_target, prop) {
        if (prop === 'lastDismissedBrazeBanner') {
          return 'campaign-xyz';
        }
        throw new Error('Unexpected migration failure');
      },
      has(_target, prop) {
        return prop === 'lastDismissedBrazeBanner';
      },
      ownKeys() {
        throw new Error('Unexpected migration failure');
      },
      getOwnPropertyDescriptor() {
        return { configurable: true, enumerable: true };
      },
    });

    const state: TestState = { banners };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Migration 153: Failed to remove lastDismissedBrazeBanner',
        ),
      }),
    );
  });
});
