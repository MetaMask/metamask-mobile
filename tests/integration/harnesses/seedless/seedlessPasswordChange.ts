import { deriveStateFromMetadata } from '@metamask/base-controller';
import { Messenger } from '@metamask/messenger';
import { KeyringControllerErrorMessage } from '@metamask/keyring-controller';
import {
  AuthConnection,
  SeedlessOnboardingController,
  Web3AuthNetwork,
  type SeedlessOnboardingControllerState,
} from '@metamask/seedless-onboarding-controller';
import { secp256k1 } from '@noble/curves/secp256k1';

// Seedless password-change integration harness. The vault encryptor is
// in-memory because Jest mocks Mobile's `Encryptor`.

type ToprfClient = SeedlessOnboardingController['toprfClient'];
type KeyPair = Parameters<ToprfClient['addSecretDataItem']>[0]['authKeyPair'];
type SecretItem = Awaited<
  ReturnType<ToprfClient['fetchAllSecretDataItems']>
>[number];

export type ChangeEncKeyFault =
  | 'sss_store_fails'
  | 'metadata_set_fails_after_sss_ok'
  | 'change_enc_key_times_out';

export class FakePasswordBackend {
  readonly passwords: string[] = [];

  current = -1;

  readonly metadata = new Map<string, SecretItem[]>();

  nextChangeEncKeyFault: ChangeEncKeyFault | undefined;

  #nextItemId = 1;

  keyFor(index: number) {
    const keyId = index + 1;
    const sk = BigInt(keyId);
    const authKeyPair: KeyPair = {
      sk,
      pk: secp256k1.Point.BASE.multiply(sk).toBytes(true),
    };
    return {
      encKey: new Uint8Array(32).fill(keyId),
      pwEncKey: new Uint8Array(32).fill(keyId + 100),
      authKeyPair,
      oprfKey: sk,
    };
  }

  addKey(password: string): number {
    this.passwords.push(password);
    return this.passwords.length - 1;
  }

  namespaceOf(authKeyPair: KeyPair): string {
    return Buffer.from(authKeyPair.pk).toString('hex');
  }

  indexOfAuthPubKey(authPubKey: Uint8Array): number {
    const hex = Buffer.from(authPubKey).toString('hex');
    return this.passwords.findIndex(
      (_, index) =>
        Buffer.from(this.keyFor(index).authKeyPair.pk).toString('hex') === hex,
    );
  }

  addItem(authKeyPair: KeyPair, item: Omit<SecretItem, 'itemId' | 'version'>) {
    const namespace = this.namespaceOf(authKeyPair);
    const items = this.metadata.get(namespace) ?? [];
    items.push({ ...item, itemId: `item-${this.#nextItemId}`, version: 'v2' });
    this.#nextItemId += 1;
    this.metadata.set(namespace, items);
  }

  moveItems(from: KeyPair, to: KeyPair) {
    this.metadata.set(
      this.namespaceOf(to),
      this.metadata.get(this.namespaceOf(from)) ?? [],
    );
  }

  changePasswordOnAnotherDevice(password: string) {
    const previous = this.keyFor(this.current).authKeyPair;
    this.current = this.addKey(password);
    this.moveItems(previous, this.keyFor(this.current).authKeyPair);
  }
}

export class FakeVaultEncryptor {
  readonly #entries = new Map<string, { data: string; keyString: string }>();

  readonly #passwordByKey = new Map<string, string>();

  #nextId = 1;

  #write(data: string, keyString: string): string {
    const id = `vault-${this.#nextId}`;
    this.#nextId += 1;
    this.#entries.set(id, { data, keyString });
    return id;
  }

  #read(id: string) {
    const entry = this.#entries.get(id);
    if (!entry) {
      throw new Error('Unknown vault');
    }
    return entry;
  }

  encryptWithDetail = jest.fn(async (password: string, data: string) => {
    const keyString = `key-${this.#nextId}`;
    this.#passwordByKey.set(keyString, password);
    const id = this.#write(data, keyString);
    return {
      vault: JSON.stringify({ id, salt: `salt-${id}`, data: id, iv: id }),
      exportedKeyString: keyString,
    };
  });

  decryptWithDetail = jest.fn(async (password: string, vault: string) => {
    const { id, salt } = JSON.parse(vault);
    const entry = this.#read(id);
    if (this.#passwordByKey.get(entry.keyString) !== password) {
      throw new Error('Incorrect password');
    }
    return { vault: entry.data, exportedKeyString: entry.keyString, salt };
  });

  decrypt = jest.fn(
    async (password: string, vault: string) =>
      (await this.decryptWithDetail(password, vault)).vault,
  );

  importKey = jest.fn(async (keyString: string) => ({ keyString }));

  encryptWithKey = jest.fn(
    async ({ keyString }: { keyString: string }, data: string) => {
      const id = this.#write(data, keyString);
      return { id, data: id, iv: id } as {
        id: string;
        data: string;
        iv: string;
        salt?: string;
      };
    },
  );

  decryptWithKey = jest.fn(
    async ({ keyString }: { keyString: string }, payload: { id: string }) => {
      const entry = this.#read(payload.id);
      if (entry.keyString !== keyString) {
        throw new Error('Incorrect key');
      }
      return entry.data;
    },
  );
}

export class FakeKeyringController {
  #password: string;

  #unlocked = true;

  constructor(password: string) {
    this.#password = password;
  }

  get isUnlocked(): boolean {
    return this.#unlocked;
  }

  #encryptionKey(): string {
    return `keyring-key:${this.#password}`;
  }

  lock(): void {
    this.#unlocked = false;
  }

  submitPassword = jest.fn(async (password: string): Promise<void> => {
    if (password !== this.#password) {
      throw new Error('Incorrect password');
    }
    this.#unlocked = true;
  });

  submitEncryptionKey = jest.fn(async (key: string): Promise<void> => {
    if (key !== this.#encryptionKey()) {
      throw new Error('Incorrect encryption key');
    }
    this.#unlocked = true;
  });

  exportEncryptionKey = jest.fn(async (): Promise<string> => {
    if (!this.#unlocked) {
      throw new Error(KeyringControllerErrorMessage.ControllerLocked);
    }
    return this.#encryptionKey();
  });

  changePassword = jest.fn(async (password: string): Promise<void> => {
    if (!this.#unlocked) {
      throw new Error(KeyringControllerErrorMessage.ControllerLocked);
    }
    this.#password = password;
  });
}

export const persistedState = (
  controller: SeedlessOnboardingController,
): Partial<SeedlessOnboardingControllerState> =>
  deriveStateFromMetadata(
    controller.state,
    controller.metadata,
    'persist',
  ) as Partial<SeedlessOnboardingControllerState>;

const nowSeconds = () => Math.floor(Date.now() / 1000);

const longLivedJwt = (subject: string): string => {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ sub: subject, iat: nowSeconds(), exp: nowSeconds() + 86_400 }),
    'signature',
  ].join('.');
};

const longLivedNodeAuthToken = (nodeIndex: number): string =>
  Buffer.from(
    JSON.stringify({ nodeIndex, exp: nowSeconds() + 86_400 }),
  ).toString('base64');

const installFakeToprfClient = (
  controller: SeedlessOnboardingController,
  backend: FakePasswordBackend,
) => {
  const { toprfClient } = controller;

  jest.spyOn(toprfClient, 'authenticate').mockImplementation(async () => ({
    nodeAuthTokens: [1, 2, 3].map((nodeIndex) => ({
      authToken: longLivedNodeAuthToken(nodeIndex),
      nodeIndex,
      nodePubKey: `node-pub-${nodeIndex}`,
    })),
    isNewUser: backend.current < 0,
  }));

  jest
    .spyOn(toprfClient, 'createLocalKey')
    .mockImplementation(async ({ password }) => ({
      ...backend.keyFor(backend.addKey(password)),
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
      backend.current = Number(oprfKey) - 1;
    });

  jest
    .spyOn(toprfClient, 'recoverEncKey')
    .mockImplementation(async ({ password }) => {
      if (backend.passwords[backend.current] !== password) {
        throw new Error('Invalid password');
      }
      const { encKey, pwEncKey, authKeyPair } = backend.keyFor(backend.current);
      return {
        encKey,
        pwEncKey,
        authKeyPair,
        keyShareIndex: backend.current + 1,
        rateLimitResetResult: Promise.resolve(),
      };
    });

  jest.spyOn(toprfClient, 'fetchAuthPubKey').mockImplementation(async () => ({
    authPubKey: backend.keyFor(backend.current).authKeyPair.pk,
    keyIndex: backend.current + 1,
  }));

  jest
    .spyOn(toprfClient, 'fetchAllSecretDataItems')
    .mockImplementation(
      async ({ authKeyPair }) =>
        backend.metadata.get(backend.namespaceOf(authKeyPair)) ?? [],
    );

  jest
    .spyOn(toprfClient, 'changeEncKey')
    .mockImplementation(async ({ newPassword, oldAuthKeyPair }) => {
      const fault = backend.nextChangeEncKeyFault;
      backend.nextChangeEncKeyFault = undefined;
      if (fault === 'sss_store_fails') {
        throw new Error('SSS store failed');
      }
      if (!newPassword) {
        throw new Error('changeEncKey needs a new password');
      }
      const next = backend.addKey(newPassword);
      backend.current = next;
      const { encKey, pwEncKey, authKeyPair } = backend.keyFor(next);
      if (fault === 'metadata_set_fails_after_sss_ok') {
        throw new Error('Metadata set failed');
      }
      backend.moveItems(oldAuthKeyPair, authKeyPair);
      if (fault === 'change_enc_key_times_out') {
        throw new Error('changeEncKey timed out');
      }
      return { encKey, pwEncKey, authKeyPair };
    });

  jest
    .spyOn(toprfClient, 'recoverPwEncKey')
    .mockImplementation(async ({ targetAuthPubKey }) => {
      const target = backend.indexOfAuthPubKey(targetAuthPubKey);
      if (target < 0) {
        throw new Error('Target key not in the password chain');
      }
      return { pwEncKey: backend.keyFor(target).pwEncKey };
    });
};

export interface PasswordChangeInstall {
  controller: SeedlessOnboardingController;
  signIn: () => Promise<{ isNewUser: boolean }>;
}

export interface PasswordChangeHarness {
  backend: FakePasswordBackend;
  encryptor: FakeVaultEncryptor;
  newInstall: (
    state?: Partial<SeedlessOnboardingControllerState>,
  ) => PasswordChangeInstall;
}

export const buildSeedlessPasswordChangeHarness = (): PasswordChangeHarness => {
  const backend = new FakePasswordBackend();
  const encryptor = new FakeVaultEncryptor();

  const newInstall = (
    state?: Partial<SeedlessOnboardingControllerState>,
  ): PasswordChangeInstall => {
    const root = new Messenger<'Root', never, never>({ namespace: 'Root' });
    const messenger = new Messenger({
      namespace: 'SeedlessOnboardingController',
      parent: root,
    });

    const controller = new SeedlessOnboardingController({
      messenger: messenger as never,
      encryptor: encryptor as never,
      network: Web3AuthNetwork.Devnet,
      state,
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
        authConnectionId: 'integration-connection',
        userId: 'integration-user',
      });

    return { controller, signIn };
  };

  return { backend, encryptor, newInstall };
};
