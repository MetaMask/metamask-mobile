import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './133';
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

describe(`Migration ${migrationVersion}: Add lastDismissedBrazeBanner to banners slice`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
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

  it('returns state unchanged if state is not an object', () => {
    const result = migrate(null);

    expect(result).toBeNull();
  });

  it('adds lastDismissedBrazeBanner with null when the field is absent', () => {
    const state: TestState = {
      banners: {
        dismissedBanners: ['some-banner'],
      },
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect((result as TestState).banners?.lastDismissedBrazeBanner).toBeNull();
  });

  it('does not overwrite lastDismissedBrazeBanner when it already exists', () => {
    const state: TestState = {
      banners: {
        dismissedBanners: [],
        lastDismissedBrazeBanner: 'existing-banner-id',
      },
    };

    migrate(state);

    expect(state.banners?.lastDismissedBrazeBanner).toBe('existing-banner-id');
  });

  it('does not overwrite lastDismissedBrazeBanner when it is already null', () => {
    const state: TestState = {
      banners: {
        lastDismissedBrazeBanner: null,
      },
    };

    migrate(state);

    expect(state.banners?.lastDismissedBrazeBanner).toBeNull();
  });

  it('captures exceptions and returns state on unexpected errors', () => {
    // Proxy has no own `lastDismissedBrazeBanner` (so hasProperty returns false)
    // but throws when any property is set.
    const banners = new Proxy({} as Record<string, unknown>, {
      set() {
        throw new Error('Unexpected migration failure');
      },
    });

    const state: TestState = { banners };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Migration 132: Failed to add lastDismissedBrazeBanner',
        ),
      }),
    );
  });
});
