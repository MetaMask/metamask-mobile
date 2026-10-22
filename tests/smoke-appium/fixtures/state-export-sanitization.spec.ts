import type { Mockttp } from 'mockttp';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import {
  USER_STORAGE_GROUPS_FEATURE_KEY,
  USER_STORAGE_WALLETS_FEATURE_KEY,
} from '@metamask/account-tree-controller';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { FixtureValidation } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { readFixtureFile } from '../../framework/fixtures/fixture-validation.js';
import { TestSuiteParams } from '../../framework/types.js';
import type CommandQueueServer from '../../framework/fixtures/CommandQueueServer.js';
import { createUserStorageController } from '../../smoke/identity/utils/mocks.js';

/**
 * Controller fields whose metadata sets includeInStateLogs to false.
 * cardHomeData and cardHomeDataAddress are reduced before export, so they are
 * not in this list.
 */
const STATE_LOG_OMITTED_FIELDS = {
  CardController: [
    'providerUserId',
    'providerData',
    'signInLink',
    'accountLookupCache',
    'cardLinks',
    'cardHomeDataStatus',
    'cardHomeDataFetchedThisSession',
    'moneyAccountCardLinkInProgress',
  ],
  RewardsMoneyController: [
    'referralMe',
    'referralCodes',
    'referralFunnel',
    'earningsSummary',
    'earningsLedgerFirstPage',
    'claimHistoryFirstPage',
    'commissionsFirstPage',
    'claimById',
  ],
  RewardsController: ['rewardsEnvUrl'],
  UiSlotsController: [
    'enabled',
    'screenConfigurations',
    'activeConfigurations',
  ],
} as const;

const SEEDED_MARKERS = [
  'state-export-card-user',
  'state-export-linked-account',
  'state-export-referral-code',
  'state-export-claim-signature',
  'state-export-rewards-env',
  'state-export-ui-slot',
] as const;

const JWT_PATTERN =
  /eyJ[A-Za-z0-9_-]{8,}={0,2}\.[A-Za-z0-9_-]{8,}={0,2}\.[A-Za-z0-9_-]+/;
const SESSION_WAIT_MS = 60000;

function assertValueAbsent(serialized: string, value: string, label: string) {
  if (value.length > 0 && serialized.includes(value)) {
    throw new Error(`${label} was included in the exported state`);
  }
}

function backgroundStateOf(fixture: {
  state: unknown;
}): Record<string, unknown> {
  return (
    fixture.state as {
      engine: { backgroundState: Record<string, unknown> };
    }
  ).engine.backgroundState;
}

function seedStateLogOmittedFields(fixture: { state: unknown }): void {
  const background = backgroundStateOf(fixture);
  const card = {
    ...((background.CardController as Record<string, unknown>) ?? {}),
  };
  card.providerUserId = 'state-export-card-user';
  card.providerData = { baanx: { location: 'us' } };
  card.signInLink = {
    providerId: 'baanx',
    status: 'started',
    address: '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
    providerUserId: 'state-export-card-user',
    updatedAt: 1,
  };
  card.accountLookupCache = {
    'baanx:0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3': {
      result: 'found',
      checkedAt: 1,
    },
  };
  card.cardLinks = [
    {
      provider: 'baanx',
      status: 'active',
      linkedAccountRef: 'state-export-linked-account',
      closedReason: null,
      migratedToProvider: null,
      linkedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];
  card.cardHomeDataStatus = 'success';
  card.cardHomeDataFetchedThisSession = true;
  card.moneyAccountCardLinkInProgress = true;
  background.CardController = card;

  const profileCache = {
    payload: {},
    lastFetched: 1,
  };
  background.RewardsMoneyController = {
    referralMe: {
      'profile-id': {
        lastFetched: 1,
        payload: {
          referral_code: { code: 'state-export-referral-code' },
        },
      },
    },
    referralCodes: {
      'profile-id': {
        lastFetched: 1,
        payload: { codes: [{ code: 'state-export-referral-code' }] },
      },
    },
    referralFunnel: {
      'profile-id': { ...profileCache, payload: { enrolled: 1 } },
    },
    earningsSummary: { 'profile-id:all': profileCache },
    earningsLedgerFirstPage: { 'profile-id:all': profileCache },
    claimHistoryFirstPage: {
      'profile-id': {
        lastFetched: 1,
        payload: {
          results: [{ signature: 'state-export-claim-signature' }],
        },
      },
    },
    commissionsFirstPage: { 'profile-id:all': profileCache },
    claimById: {
      'profile-id:claim-id': {
        lastFetched: 1,
        payload: { signature: 'state-export-claim-signature' },
      },
    },
  };

  background.RewardsController = {
    ...((background.RewardsController as Record<string, unknown>) ?? {}),
    rewardsEnvUrl: 'http://127.0.0.1:9/state-export-rewards-env',
  };

  background.UiSlotsController = {
    ...((background.UiSlotsController as Record<string, unknown>) ?? {}),
    enabled: true,
    screenConfigurations: {
      'home:en': {
        fetchedAt: 1,
        response: {
          slots: [{ contentId: 'state-export-ui-slot' }],
        },
      },
    },
    activeConfigurations: {
      home: { configurationKey: 'home:en', slotsById: {} },
    },
  };
}

function omittedFieldsPresent(
  background: Record<string, unknown> | undefined,
): string[] {
  if (!background) {
    return [];
  }
  const present: string[] = [];
  for (const [controllerName, fields] of Object.entries(
    STATE_LOG_OMITTED_FIELDS,
  )) {
    const controller = background[controllerName];
    if (!controller || typeof controller !== 'object') {
      continue;
    }
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(controller, field)) {
        present.push(`${controllerName}.${field}`);
      }
    }
  }
  return present;
}

function fixtureKeyringVault(): string {
  const fixture = readFixtureFile('default-fixture.json');
  const state = fixture.state as {
    engine: {
      backgroundState: {
        KeyringController: { vault?: string };
      };
    };
  };
  return state.engine.backgroundState.KeyringController.vault ?? '';
}

async function mockUserStorage(mockServer: Mockttp): Promise<void> {
  const userStorage = createUserStorageController();
  for (const feature of [
    USER_STORAGE_FEATURE_NAMES.accounts,
    USER_STORAGE_FEATURE_NAMES.addressBook,
    USER_STORAGE_GROUPS_FEATURE_KEY,
    USER_STORAGE_WALLETS_FEATURE_KEY,
  ]) {
    await userStorage.setupPath(feature, mockServer);
  }
}

async function waitForProfileSession(
  commandQueueServer: CommandQueueServer,
): Promise<void> {
  const deadline = Date.now() + SESSION_WAIT_MS;
  while (Date.now() < deadline) {
    commandQueueServer.requestStateExport();
    const rawExport = await commandQueueServer.getExportedState(20000);
    const auth = (rawExport.engine as Record<string, unknown>)
      .AuthenticationController as
      | { isSignedIn?: boolean; srpSessionData?: Record<string, unknown> }
      | undefined;
    if (
      auth?.isSignedIn === true &&
      Object.keys(auth.srpSessionData ?? {}).length > 0
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('Profile sync session was not created after login');
}

async function waitForSeededState(
  commandQueueServer: CommandQueueServer,
): Promise<void> {
  const deadline = Date.now() + SESSION_WAIT_MS;
  while (Date.now() < deadline) {
    commandQueueServer.requestStateExport();
    const rawExport = await commandQueueServer.getExportedState(20000);
    const serialized = JSON.stringify(rawExport.engine);
    if (SEEDED_MARKERS.every((marker) => serialized.includes(marker))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('Seeded controller state was not loaded into the app');
}

appiumTest.describe(FixtureValidation('State export sanitization'), () => {
  appiumTest.describe.configure({ timeout: 240000 });

  appiumTest(
    'omits sensitive material from the in-app state export',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: (() => {
            const fixture = new FixtureBuilder()
              .withBackupAndSyncSettings()
              .build();
            seedStateLogOmittedFields(fixture);
            return fixture;
          })(),
          restartDevice: true,
          currentDeviceDetails,
          useCommandQueueServer: true,
          testSpecificMock: mockUserStorage,
        },
        async ({ commandQueueServer }: TestSuiteParams) => {
          if (!commandQueueServer) {
            throw new Error('Command queue server not available');
          }

          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await waitForProfileSession(commandQueueServer);
          await waitForSeededState(commandQueueServer);

          const vault = fixtureKeyringVault();
          commandQueueServer.requestAppStateExport();
          const appExport = await commandQueueServer.getExportedAppState(20000);
          const serialized = JSON.stringify(appExport);

          const appBackground = (
            appExport.engine as {
              backgroundState?: Record<string, unknown>;
            }
          ).backgroundState;
          const appKeyring = appBackground?.KeyringController as
            | Record<string, unknown>
            | undefined;
          const appQrSync = appBackground?.QrSyncController as
            | Record<string, unknown>
            | undefined;
          const seedless = appBackground?.SeedlessOnboardingController as
            | Record<string, unknown>
            | undefined;

          if (JWT_PATTERN.test(serialized)) {
            throw new Error('State export includes a JWT-shaped token');
          }
          if (serialized.includes('srpSessionData')) {
            throw new Error('State export includes profile sync session data');
          }
          if (appBackground?.AuthenticationController !== undefined) {
            throw new Error('State export still includes authentication state');
          }
          if (!appKeyring || 'vault' in appKeyring) {
            throw new Error(
              'State export still includes the keyring vault field',
            );
          }
          if (typeof appKeyring.vaultExists !== 'boolean') {
            throw new Error('State export is missing the vault presence flag');
          }
          if (
            appQrSync &&
            ('otp' in appQrSync ||
              'pendingSecretImports' in appQrSync ||
              'provisioningMetadata' in appQrSync ||
              'provisioningStatus' in appQrSync)
          ) {
            throw new Error(
              'State export still includes QR sync secret fields',
            );
          }
          for (const field of [
            'accessToken',
            'refreshToken',
            'revokeToken',
            'metadataAccessToken',
            'vaultEncryptionKey',
            'vaultEncryptionSalt',
            'encryptedSeedlessEncryptionKey',
            'encryptedKeyringEncryptionKey',
          ]) {
            if (seedless && typeof seedless[field] === 'string') {
              throw new Error(
                'State export still includes a seedless credential',
              );
            }
          }
          assertValueAbsent(serialized, vault, 'Keyring vault');

          const stillExported = omittedFieldsPresent(appBackground);
          if (stillExported.length > 0) {
            throw new Error(
              `State export includes fields excluded from state logs: ${stillExported.join(', ')}`,
            );
          }
          if (SEEDED_MARKERS.some((marker) => serialized.includes(marker))) {
            throw new Error(
              'State export includes a value from a field excluded from state logs',
            );
          }
        },
      );
    },
  );
});
