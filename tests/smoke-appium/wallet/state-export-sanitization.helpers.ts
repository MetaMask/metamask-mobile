import type { Mockttp } from 'mockttp';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import {
  USER_STORAGE_GROUPS_FEATURE_KEY,
  USER_STORAGE_WALLETS_FEATURE_KEY,
} from '@metamask/account-tree-controller';
import type CommandQueueServer from '../../framework/fixtures/CommandQueueServer.js';
import { readFixtureFile } from '../../framework/fixtures/fixture-validation.js';
import {
  STATE_LOG_OMITTED_FIELDS,
  STATE_LOG_SEEDED_MARKERS,
} from '../../framework/fixtures/state-log-omitted-fields.js';
import { createUserStorageController } from '../../smoke/identity/utils/mocks.js';

const JWT_PATTERN =
  /eyJ[A-Za-z0-9_-]{8,}={0,2}\.[A-Za-z0-9_-]{8,}={0,2}\.[A-Za-z0-9_-]+/;
const SESSION_WAIT_MS = 60000;

const QR_SYNC_SECRET_FIELDS = [
  'otp',
  'pendingSecretImports',
  'provisioningMetadata',
  'provisioningStatus',
] as const;

const SEEDLESS_CREDENTIAL_FIELDS = [
  'accessToken',
  'refreshToken',
  'revokeToken',
  'metadataAccessToken',
  'vaultEncryptionKey',
  'vaultEncryptionSalt',
  'encryptedSeedlessEncryptionKey',
  'encryptedKeyringEncryptionKey',
] as const;

interface SanitizedAuthenticationExport {
  srpSessionData?: Record<
    string,
    {
      token?: Record<string, unknown>;
      profile?: Record<string, unknown>;
    }
  >;
  enrolledCredentials?: Record<string, unknown>[];
}

function assertSanitizedAuthenticationExport(
  auth: SanitizedAuthenticationExport | undefined,
): void {
  const sessions = auth?.srpSessionData;
  if (!sessions || Object.keys(sessions).length === 0) {
    throw new Error('State export is missing sanitized profile session data');
  }
  for (const session of Object.values(sessions)) {
    if (session.token && 'accessToken' in session.token) {
      throw new Error('State export includes a profile access token');
    }
    if (session.profile && 'pairedIdentifierIds' in session.profile) {
      throw new Error('State export includes paired profile identifiers');
    }
    if (
      typeof session.profile?.profileId !== 'string' ||
      session.profile.profileId.length === 0
    ) {
      throw new Error('State export is missing the profile id');
    }
  }
  for (const credential of auth.enrolledCredentials ?? []) {
    if ('email' in credential || 'displayName' in credential) {
      throw new Error('State export includes credential personal data');
    }
  }
}

function assertValueAbsent(serialized: string, value: string, label: string) {
  if (value.length === 0) {
    return;
  }
  // JSON.stringify escapes quotes inside the value, so a leaked copy is not
  // always the raw string.
  const escaped = JSON.stringify(value).slice(1, -1);
  if (serialized.includes(value) || serialized.includes(escaped)) {
    throw new Error(`${label} was included in the exported state`);
  }
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

export async function mockUserStorage(mockServer: Mockttp): Promise<void> {
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

export async function waitForProfileSession(
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

export async function waitForSeededState(
  commandQueueServer: CommandQueueServer,
): Promise<void> {
  const deadline = Date.now() + SESSION_WAIT_MS;
  while (Date.now() < deadline) {
    commandQueueServer.requestStateExport();
    const rawExport = await commandQueueServer.getExportedState(20000);
    const serialized = JSON.stringify(rawExport.engine);
    if (
      STATE_LOG_SEEDED_MARKERS.every((marker) => serialized.includes(marker))
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('Seeded controller state was not loaded into the app');
}

export async function assertInAppStateExportOmitsSensitiveFields(
  commandQueueServer: CommandQueueServer,
): Promise<void> {
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
  assertSanitizedAuthenticationExport(
    appBackground?.AuthenticationController as
      | SanitizedAuthenticationExport
      | undefined,
  );
  if (!appKeyring || 'vault' in appKeyring) {
    throw new Error('State export still includes the keyring vault field');
  }
  if (typeof appKeyring.vaultExists !== 'boolean') {
    throw new Error('State export is missing the vault presence flag');
  }
  if (appQrSync && QR_SYNC_SECRET_FIELDS.some((field) => field in appQrSync)) {
    throw new Error('State export still includes QR sync secret fields');
  }
  for (const field of SEEDLESS_CREDENTIAL_FIELDS) {
    if (seedless && typeof seedless[field] === 'string') {
      throw new Error('State export still includes a seedless credential');
    }
  }
  assertValueAbsent(serialized, vault, 'Keyring vault');

  const stillExported = omittedFieldsPresent(appBackground);
  if (stillExported.length > 0) {
    throw new Error(
      `State export includes fields excluded from state logs: ${stillExported.join(', ')}`,
    );
  }
  if (STATE_LOG_SEEDED_MARKERS.some((marker) => serialized.includes(marker))) {
    throw new Error(
      'State export includes a value from a field excluded from state logs',
    );
  }
}
