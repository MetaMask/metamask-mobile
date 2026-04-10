import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './132';
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
  engine: {
    backgroundState: {
      SeedlessOnboardingController?: Record<string, unknown>;
      [key: string]: unknown;
    };
  };
  [key: string]: unknown;
}

describe(`Migration ${migrationVersion}: Seedless vault data → cipher`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('returns state unchanged if ensureValidState returns false', () => {
    const testState = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const result = migrate(testState);

    expect(result).toBe(testState);
  });

  it('returns state unchanged if SeedlessOnboardingController is missing', () => {
    const testState: TestState = {
      engine: {
        backgroundState: {},
      },
    };

    const result = migrate(testState);

    expect(result).toBe(testState);
  });

  it('returns state unchanged if vault is null', () => {
    const testState: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { vault: null },
        },
      },
    };

    const result = migrate(testState);

    expect(result).toBe(testState);
  });

  it('copies data to cipher and removes data when cipher is absent', () => {
    const vaultObj = {
      data: 'encrypted-payload',
      iv: 'iv-value',
      salt: 'salt-value',
    };
    const testState: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: {
            vault: JSON.stringify(vaultObj),
          },
        },
      },
    };

    migrate(testState);

    const seedless = testState.engine.backgroundState
      .SeedlessOnboardingController as Record<string, unknown>;
    const parsed = JSON.parse(seedless.vault as string);
    expect(parsed.cipher).toBe('encrypted-payload');
    expect(parsed.iv).toBe('iv-value');
    expect(parsed.data).toBeUndefined();
  });

  it('does not change vault when cipher is already present', () => {
    const vaultString = JSON.stringify({
      cipher: 'already-here',
      data: 'ignored',
      iv: 'iv',
    });
    const testState: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { vault: vaultString },
        },
      },
    };

    migrate(testState);

    const seedless = testState.engine.backgroundState
      .SeedlessOnboardingController as Record<string, unknown>;
    expect(seedless.vault).toBe(vaultString);
  });

  it('does not throw on invalid vault JSON and leaves vault unchanged', () => {
    const testState: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { vault: 'not-json{' },
        },
      },
    };

    const result = migrate(testState);

    expect(result).toBe(testState);
    expect(
      (
        testState.engine.backgroundState.SeedlessOnboardingController as Record<
          string,
          unknown
        >
      ).vault,
    ).toBe('not-json{');
  });

  it('captures exceptions and returns state on unexpected errors', () => {
    const seedless: Record<string, unknown> = {};
    Object.defineProperty(seedless, 'vault', {
      configurable: true,
      enumerable: true,
      get() {
        return '{"data":"x","iv":"y"}';
      },
      set() {
        throw new Error('Unexpected failure');
      },
    });

    const testState: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: seedless,
        },
      },
    };

    const result = migrate(testState);

    expect(result).toBe(testState);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Migration 132: Failed to migrate seedless vault data to cipher',
        ),
      }),
    );
  });
});
