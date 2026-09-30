import { Messenger } from '@metamask/messenger';
import {
  AuthConnection,
  EncAccountDataType,
  SeedlessOnboardingController,
  Web3AuthNetwork,
} from '@metamask/seedless-onboarding-controller';
// The controller detects an expired token with `instanceof TOPRFError`, so the
// harness needs the same class the controller loads from its own dependency.
// eslint-disable-next-line import-x/no-extraneous-dependencies
import { TOPRFError, TOPRFErrorCode } from '@metamask/toprf-secure-backup';
import { secp256k1 } from '@noble/curves/secp256k1';
import { seedlessOnboardingEncryptorAdapter } from '../../../../app/core/Engine/wallet-init/instance-options/seedless-onboarding-controller';

/**
 * Seedless onboarding integration-test harness.
 *
 * REAL: SeedlessOnboardingController (lock, token-refresh retry, vault
 * creation, backup-metadata state) and Mobile's
 * `seedlessOnboardingEncryptorAdapter` for the local vault.
 * MOCKED: the TOPRF client that talks to SSS and the metadata store, backed
 * by an in-memory store, and the auth-server token callbacks.
 */

type ToprfClient = SeedlessOnboardingController['toprfClient'];
type KeyPair = Parameters<ToprfClient['addSecretDataItem']>[0]['authKeyPair'];
type SecretItem = Awaited<
  ReturnType<ToprfClient['fetchAllSecretDataItems']>
>[number];

/** One saved OPRF key: the key SSS hands back on recovery. */
interface SavedKey {
  keyId: number;
  password: string;
}

/**
 * In-memory stand-in for SSS and the metadata store.
 *
 * SSS keeps one key per user. The metadata store keeps secret items per auth
 * public key, so an SRP written under one key is invisible to an install that
 * recovers a different key. That separation is what a key split looks like.
 */
export class FakeToprfBackend {
  /** The key SSS returns on recovery, or undefined for a new user. */
  persistedKey: SavedKey | undefined;

  /** Secret items, keyed by the hex of the auth public key they were written under. */
  readonly metadata = new Map<string, SecretItem[]>();

  /** Every key id `createLocalKey` handed out, in order. */
  readonly createdKeyIds: number[] = [];

  readonly #passwordByKeyId = new Map<number, string>();

  #nextKeyId = 1;

  #nextItemId = 1;

  keyFor(keyId: number) {
    const encKey = new Uint8Array(32).fill(keyId);
    const pwEncKey = new Uint8Array(32).fill(keyId + 100);
    // A real secp256k1 key pair: the controller compares auth keys as curve points.
    const sk = BigInt(keyId);
    const pk = secp256k1.Point.BASE.multiply(sk).toBytes(true);
    const authKeyPair: KeyPair = { sk, pk };
    return { encKey, pwEncKey, authKeyPair, oprfKey: sk };
  }

  createKey(password: string): number {
    const keyId = this.#nextKeyId;
    this.#nextKeyId += 1;
    this.createdKeyIds.push(keyId);
    this.#passwordByKeyId.set(keyId, password);
    return keyId;
  }

  saveKey(keyId: number) {
    this.persistedKey = {
      keyId,
      password: this.#passwordByKeyId.get(keyId) ?? '',
    };
  }

  namespaceOf(authKeyPair: KeyPair): string {
    return Buffer.from(authKeyPair.pk).toString('hex');
  }

  addItem(authKeyPair: KeyPair, item: Omit<SecretItem, 'itemId' | 'version'>) {
    const namespace = this.namespaceOf(authKeyPair);
    const items = this.metadata.get(namespace) ?? [];
    // Like the metadata store: one primary SRP per auth key.
    if (
      item.dataType === EncAccountDataType.PrimarySrp &&
      items.some(
        (existing) => existing.dataType === EncAccountDataType.PrimarySrp,
      )
    ) {
      throw new Error('PRIMARY_SRP already exists for this account');
    }
    items.push({ ...item, itemId: `item-${this.#nextItemId}`, version: 'v2' });
    this.#nextItemId += 1;
    this.metadata.set(namespace, items);
  }

  itemsFor(authKeyPair: KeyPair): SecretItem[] {
    return this.metadata.get(this.namespaceOf(authKeyPair)) ?? [];
  }

  /** Namespaces that hold at least one secret item. */
  namespacesWithSecrets(): string[] {
    return [...this.metadata.entries()]
      .filter(([, items]) => items.length > 0)
      .map(([namespace]) => namespace);
  }

  /** The namespace of the key SSS would hand back on recovery. */
  savedKeyNamespace(): string {
    if (!this.persistedKey) {
      throw new Error('No key saved in SSS');
    }
    return this.namespaceOf(this.keyFor(this.persistedKey.keyId).authKeyPair);
  }
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** A JWT that is valid for a day, so the controller's real expiry checks pass. */
export const longLivedJwt = (subject: string): string => {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ sub: subject, iat: nowSeconds(), exp: nowSeconds() + 86_400 }),
    'signature',
  ].join('.');
};

/** A node auth token: base64 JSON, not a JWT. Valid for a day. */
export const longLivedNodeAuthToken = (nodeIndex: number): string =>
  Buffer.from(
    JSON.stringify({ nodeIndex, exp: nowSeconds() + 86_400 }),
  ).toString('base64');

export interface SeedlessInstall {
  controller: SeedlessOnboardingController;
  /** Sign in with social login; the backend decides new vs existing user. */
  signIn: () => Promise<{ isNewUser: boolean }>;
}

export interface SeedlessIntegrationHarness {
  backend: FakeToprfBackend;
  /** A fresh install: a new controller with no local state, same backend. */
  newInstall: () => SeedlessInstall;
}

const USER_ID = 'integration-user';
const AUTH_CONNECTION_ID = 'integration-connection';

const installFakeToprfClient = (
  controller: SeedlessOnboardingController,
  backend: FakeToprfBackend,
) => {
  const { toprfClient } = controller;

  jest.spyOn(toprfClient, 'authenticate').mockImplementation(async () => ({
    nodeAuthTokens: [1, 2, 3].map((nodeIndex) => ({
      authToken: longLivedNodeAuthToken(nodeIndex),
      nodeIndex,
      nodePubKey: `node-pub-${nodeIndex}`,
    })),
    isNewUser: backend.persistedKey === undefined,
  }));

  jest
    .spyOn(toprfClient, 'createLocalKey')
    .mockImplementation(async ({ password }) => ({
      ...backend.keyFor(backend.createKey(password)),
      seed: new Uint8Array(32),
    }));

  jest
    .spyOn(toprfClient, 'addSecretDataItem')
    .mockImplementation(async ({ secretData, authKeyPair, dataType }) => {
      backend.addItem(authKeyPair, { data: secretData, dataType });
    });

  jest
    .spyOn(toprfClient, 'persistLocalKey')
    .mockImplementation(async ({ oprfKey }) => {
      backend.saveKey(Number(oprfKey));
    });

  jest
    .spyOn(toprfClient, 'recoverEncKey')
    .mockImplementation(async ({ password }) => {
      const saved = backend.persistedKey;
      if (!saved || saved.password !== password) {
        throw new Error('Invalid password');
      }
      const { encKey, pwEncKey, authKeyPair } = backend.keyFor(saved.keyId);
      return {
        encKey,
        pwEncKey,
        authKeyPair,
        keyShareIndex: 1,
        rateLimitResetResult: Promise.resolve(),
      };
    });

  jest
    .spyOn(toprfClient, 'fetchAllSecretDataItems')
    .mockImplementation(async ({ authKeyPair }) =>
      backend.itemsFor(authKeyPair),
    );

  jest.spyOn(toprfClient, 'fetchAuthPubKey').mockImplementation(async () => {
    const saved = backend.persistedKey;
    if (!saved) {
      throw new Error('No key saved for this user');
    }
    return {
      authPubKey: backend.keyFor(saved.keyId).authKeyPair.pk,
      keyIndex: 1,
    };
  });
};

/** TOPRF client methods a fault can target. */
export type FaultableToprfMethod =
  | 'addSecretDataItem'
  | 'persistLocalKey'
  | 'fetchAllSecretDataItems';

/** The error the nodes return when the auth token has expired. */
export const authTokenExpiredError = () =>
  new TOPRFError(TOPRFErrorCode.AuthTokenExpired, 'Auth token expired');

/**
 * Fail the next call to `method` before it reaches the backend.
 *
 * @param install - The install whose client should fail.
 * @param method - The TOPRF client method.
 * @param error - The error to throw.
 */
export const failNextCall = (
  install: SeedlessInstall,
  method: FaultableToprfMethod,
  error: Error = new Error(`${method} failed`),
) => {
  jest
    .mocked(install.controller.toprfClient[method])
    .mockRejectedValueOnce(error);
};

/**
 * Let the next call to `method` reach the backend, then throw as if the
 * response never arrived. The write is committed; the client does not know.
 *
 * @param install - The install whose client should lose the response.
 * @param method - The TOPRF client method.
 */
export const loseNextResponse = (
  install: SeedlessInstall,
  method: FaultableToprfMethod,
) => {
  const mocked = jest.mocked(install.controller.toprfClient[method]);
  const commit = mocked.getMockImplementation() as (
    ...args: unknown[]
  ) => Promise<unknown>;
  mocked.mockImplementationOnce((async (...args: unknown[]) => {
    await commit(...args);
    throw new Error(`${method} response lost`);
  }) as never);
};

/**
 * Build a harness with one shared backend. Call `newInstall()` for each install.
 *
 * @returns The harness.
 */
export const buildSeedlessIntegrationHarness =
  (): SeedlessIntegrationHarness => {
    const backend = new FakeToprfBackend();

    const newInstall = (): SeedlessInstall => {
      const root = new Messenger<'Root', never, never>({ namespace: 'Root' });
      const messenger = new Messenger({
        namespace: 'SeedlessOnboardingController',
        parent: root,
      });

      const controller = new SeedlessOnboardingController({
        messenger: messenger as never,
        encryptor: seedlessOnboardingEncryptorAdapter as never,
        network: Web3AuthNetwork.Devnet,
        refreshJWTToken: jest.fn(async () => ({
          idTokens: [longLivedJwt('refreshed-id')],
          accessToken: longLivedJwt('refreshed-access'),
          metadataAccessToken: longLivedJwt('refreshed-metadata'),
        })),
        revokeRefreshToken: jest.fn(async () => undefined),
        renewRefreshToken: jest.fn(async () => ({
          newRevokeToken: 'revoke',
          newRefreshToken: 'refresh',
        })),
      });

      installFakeToprfClient(controller, backend);

      const signIn = async () =>
        await controller.authenticate({
          idTokens: [longLivedJwt('id-token')],
          accessToken: longLivedJwt('access-token'),
          metadataAccessToken: longLivedJwt('metadata-access-token'),
          refreshToken: 'refresh-token',
          revokeToken: 'revoke-token',
          authConnection: AuthConnection.Google,
          authConnectionId: AUTH_CONNECTION_ID,
          userId: USER_ID,
        });

      return { controller, signIn };
    };

    return { backend, newInstall };
  };
