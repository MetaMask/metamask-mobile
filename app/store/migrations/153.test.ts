import { AuthConnection } from '../../core/OAuthService/OAuthInterface';
import { BFT_CHILD_PREFERENCES } from '../../util/basicFunctionality/bftChildPreferences';
import migrate, { migrationVersion } from './153';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);

function buildChildren(enabledCount: number) {
  return Object.fromEntries(
    BFT_CHILD_PREFERENCES.map((preference, index) => [
      preference,
      index < enabledCount,
    ]),
  );
}

function buildState({
  basicFunctionalityEnabled = true,
  enabledChildren = BFT_CHILD_PREFERENCES.length,
  isBasicFunctionalityConsolidatedEnabled = false,
  authConnection,
  vault,
}: {
  basicFunctionalityEnabled?: boolean;
  enabledChildren?: number;
  isBasicFunctionalityConsolidatedEnabled?: boolean;
  authConnection?: AuthConnection;
  vault?: string;
} = {}) {
  return {
    settings: {
      basicFunctionalityEnabled,
      isBasicFunctionalityConsolidatedEnabled,
    },
    security: {},
    engine: {
      backgroundState: {
        PreferencesController: {
          ...buildChildren(enabledChildren),
          isIpfsGatewayEnabled: true,
        },
        SeedlessOnboardingController: {
          ...(authConnection ? { authConnection } : {}),
          ...(vault ? { vault } : {}),
        },
      },
    },
  };
}

describe(`migration #${migrationVersion}`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('skips users already enrolled in the consolidated cohort', () => {
    const state = buildState({
      isBasicFunctionalityConsolidatedEnabled: true,
      basicFunctionalityEnabled: false,
      enabledChildren: 0,
    });

    const migrated = migrate(state) as typeof state;

    expect(migrated).toBe(state);
  });

  it('silently consolidates BF ON with all children ON', () => {
    const migrated = migrate(
      buildState({
        basicFunctionalityEnabled: true,
        enabledChildren: BFT_CHILD_PREFERENCES.length,
      }),
    ) as ReturnType<typeof buildState> & {
      settings: {
        basicFunctionalityMigrationNotificationPending?: boolean;
      };
    };

    expect(migrated.settings.basicFunctionalityEnabled).toBe(true);
    expect(migrated.settings.isBasicFunctionalityConsolidatedEnabled).toBe(
      true,
    );
    expect(
      migrated.settings.basicFunctionalityMigrationNotificationPending,
    ).toBe(false);

    for (const preference of BFT_CHILD_PREFERENCES) {
      expect(
        migrated.engine.backgroundState.PreferencesController[preference],
      ).toBe(true);
    }
  });

  it('silently consolidates BF OFF with all children OFF', () => {
    const migrated = migrate(
      buildState({
        basicFunctionalityEnabled: false,
        enabledChildren: 0,
      }),
    ) as ReturnType<typeof buildState> & {
      settings: {
        basicFunctionalityMigrationNotificationPending?: boolean;
      };
    };

    expect(migrated.settings.basicFunctionalityEnabled).toBe(false);
    expect(migrated.settings.isBasicFunctionalityConsolidatedEnabled).toBe(
      true,
    );
    expect(
      migrated.settings.basicFunctionalityMigrationNotificationPending,
    ).toBe(false);
  });

  it('lands ON with notification when BF is ON and children are mixed', () => {
    const migrated = migrate(
      buildState({
        basicFunctionalityEnabled: true,
        enabledChildren: 2,
      }),
    ) as ReturnType<typeof buildState> & {
      settings: {
        basicFunctionalityMigrationNotificationPending?: boolean;
      };
    };

    expect(migrated.settings.basicFunctionalityEnabled).toBe(true);
    expect(
      migrated.settings.basicFunctionalityMigrationNotificationPending,
    ).toBe(true);

    for (const preference of BFT_CHILD_PREFERENCES) {
      expect(
        migrated.engine.backgroundState.PreferencesController[preference],
      ).toBe(true);
    }
  });

  it('lands OFF with notification when BF is OFF and some children are ON', () => {
    const migrated = migrate(
      buildState({
        basicFunctionalityEnabled: false,
        enabledChildren: 3,
      }),
    ) as ReturnType<typeof buildState> & {
      settings: {
        basicFunctionalityMigrationNotificationPending?: boolean;
      };
    };

    expect(migrated.settings.basicFunctionalityEnabled).toBe(false);
    expect(
      migrated.settings.basicFunctionalityMigrationNotificationPending,
    ).toBe(true);

    for (const preference of BFT_CHILD_PREFERENCES) {
      expect(
        migrated.engine.backgroundState.PreferencesController[preference],
      ).toBe(false);
    }
  });

  it('lands ON with notification for social login users with BF OFF', () => {
    const migrated = migrate(
      buildState({
        basicFunctionalityEnabled: false,
        enabledChildren: 0,
        authConnection: AuthConnection.Google,
        vault: 'seedless-vault',
      }),
    ) as ReturnType<typeof buildState> & {
      settings: {
        basicFunctionalityMigrationNotificationPending?: boolean;
      };
    };

    expect(migrated.settings.basicFunctionalityEnabled).toBe(true);
    expect(migrated.settings.isBasicFunctionalityConsolidatedEnabled).toBe(
      true,
    );
    expect(
      migrated.settings.basicFunctionalityMigrationNotificationPending,
    ).toBe(true);

    for (const preference of BFT_CHILD_PREFERENCES) {
      expect(
        migrated.engine.backgroundState.PreferencesController[preference],
      ).toBe(true);
    }
  });

  it('does not change IPFS gateway preference', () => {
    const migrated = migrate(
      buildState({
        basicFunctionalityEnabled: false,
        enabledChildren: 3,
      }),
    ) as ReturnType<typeof buildState>;

    expect(
      migrated.engine.backgroundState.PreferencesController
        .isIpfsGatewayEnabled,
    ).toBe(true);
  });
});
