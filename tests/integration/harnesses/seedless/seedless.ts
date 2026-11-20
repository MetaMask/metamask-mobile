import { Messenger } from '@metamask/messenger';
import {
  AuthConnection,
  EncAccountDataType,
  SeedlessOnboardingController,
  Web3AuthNetwork,
} from '@metamask/seedless-onboarding-controller';
// Same class the controller uses for its `instanceof` token-expiry check.
// eslint-disable-next-line import-x/no-extraneous-dependencies
import { TOPRFError, TOPRFErrorCode } from '@metamask/toprf-secure-backup';
import { secp256k1 } from '@noble/curves/secp256k1';
import { seedlessOnboardingEncryptorAdapter } from '../../../../app/core/Engine/wallet-init/instance-options/seedless-onboarding-controller';

/** Seedless onboarding integration harness. See STRATEGY.md for what is real and mocked. */

type ToprfClient = SeedlessOnboardingController['toprfClient'];
type KeyPair = Parameters<ToprfClient['addSecretDataItem']>[0]['authKeyPair'];
type SecretItem = Awaited<
  ReturnType<ToprfClient['fetchAllSecretDataItems']>
>[number];

interface SavedKey {
  keyId: number;
  password: string;
}

export class FakeToprfBackend {
  persistedKey: SavedKey | undefined;

  readonly metadata = new Map<string, SecretItem[]>();

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

  namespacesWithSecrets(): string[] {
    return [...this.metadata.entries()]
      .filter(([, items]) => items.length > 0)
      .map(([namespace]) => namespace);
  }

  savedKeyNamespace(): string {
    if (!this.persistedKey) {
      throw new Error('No key saved in SSS');
    }
    return this.namespaceOf(this.keyFor(this.persistedKey.keyId).authKeyPair);
  }
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

export const longLivedJwt = (subject: string): string => {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ sub: subject, iat: nowSeconds(), exp: nowSeconds() + 86_400 }),
    'signature',
  ].join('.');
};

export const longLivedNodeAuthToken = (nodeIndex: number): string =>
  Buffer.from(
    JSON.stringify({ nodeIndex, exp: nowSeconds() + 86_400 }),
  ).toString('base64');

export interface SeedlessInstall {
  controller: SeedlessOnboardingController;
  signIn: () => Promise<{ isNewUser: boolean }>;
}

export interface SeedlessIntegrationHarness {
  backend: FakeToprfBackend;
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

export type FaultableToprfMethod =
  | 'addSecretDataItem'
  | 'persistLocalKey'
  | 'fetchAllSecretDataItems';

export const authTokenExpiredError = () =>
  new TOPRFError(TOPRFErrorCode.AuthTokenExpired, 'Auth token expired');

/** Fails the next call before it reaches the backend. */
export const failNextCall = (
  install: SeedlessInstall,
  method: FaultableToprfMethod,
  error: Error = new Error(`${method} failed`),
) => {
  jest
    .mocked(install.controller.toprfClient[method])
    .mockRejectedValueOnce(error);
};

/** Commits the next call, then throws as if the response was lost. */
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
