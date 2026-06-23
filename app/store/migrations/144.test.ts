import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';
import migrate from './144';

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);

const createTestState = (overrides?: {
  seedlessVault?: string;
  keyringVault?: string;
}) => ({
  engine: {
    backgroundState: {
      SeedlessOnboardingController: {
        vault: overrides?.seedlessVault,
        socialBackupsMetadata: [],
        isSeedlessOnboardingUserAuthenticated: false,
      },
      KeyringController: {
        vault: overrides?.keyringVault,
        isUnlocked: false,
        keyrings: [],
      },
    },
  },
  settings: {},
  security: {},
});

describe('migration 144', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('returns state unchanged when ensureValidState fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = createTestState();

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('returns state unchanged when SeedlessOnboardingController is absent', () => {
    const state = createTestState();
    delete (state.engine.backgroundState as Record<string, unknown>)
      .SeedlessOnboardingController;

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('rewrites data-only seedless vault to include cipher', () => {
    const dataOnlyVault = JSON.stringify({
      data: 'encrypted-payload',
      iv: 'mock-iv',
      salt: 'mock-salt',
    });
    const state = createTestState({ seedlessVault: dataOnlyVault });

    const result = migrate(state) as ReturnType<typeof createTestState>;
    const migratedVault = JSON.parse(
      result.engine.backgroundState.SeedlessOnboardingController
        .vault as string,
    );

    expect(migratedVault.cipher).toBe('encrypted-payload');
    expect(migratedVault.data).toBe('encrypted-payload');
    expect(migratedVault.iv).toBe('mock-iv');
    expect(migratedVault.salt).toBe('mock-salt');
  });

  it('leaves cipher-only seedless vault unchanged', () => {
    const cipherVault = JSON.stringify({
      cipher: 'encrypted-payload',
      iv: 'mock-iv',
    });
    const state = createTestState({ seedlessVault: cipherVault });

    const result = migrate(state) as ReturnType<typeof createTestState>;

    expect(
      result.engine.backgroundState.SeedlessOnboardingController.vault,
    ).toBe(cipherVault);
  });

  it('leaves seedless vault unchanged when both cipher and data exist', () => {
    const vault = JSON.stringify({
      cipher: 'cipher-value',
      data: 'data-value',
      iv: 'mock-iv',
    });
    const state = createTestState({ seedlessVault: vault });

    const result = migrate(state) as ReturnType<typeof createTestState>;

    expect(
      result.engine.backgroundState.SeedlessOnboardingController.vault,
    ).toBe(vault);
  });

  it('leaves invalid JSON seedless vault unchanged', () => {
    const invalidVault = '{invalid-json';
    const state = createTestState({ seedlessVault: invalidVault });

    const result = migrate(state) as ReturnType<typeof createTestState>;

    expect(
      result.engine.backgroundState.SeedlessOnboardingController.vault,
    ).toBe(invalidVault);
  });

  it('does not modify KeyringController vault', () => {
    const keyringVault = JSON.stringify({
      data: 'keyring-data-only',
      iv: 'mock-iv',
    });
    const seedlessVault = JSON.stringify({
      data: 'seedless-data-only',
      iv: 'mock-iv',
    });
    const state = createTestState({
      seedlessVault,
      keyringVault,
    });
    const originalState = cloneDeep(state);

    migrate(state);

    expect(state.engine.backgroundState.KeyringController.vault).toBe(
      originalState.engine.backgroundState.KeyringController.vault,
    );
  });
});
