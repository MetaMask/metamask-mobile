import {
  EncAccountDataType,
  SecretType,
  SeedlessOnboardingControllerErrorMessage,
} from '@metamask/seedless-onboarding-controller';
import { seedlessOnboardingEncryptorAdapter } from '../Engine/wallet-init/instance-options/seedless-onboarding-controller';
import {
  authTokenExpiredError,
  buildSeedlessIntegrationHarness,
  failNextCall,
  loseNextResponse,
  type SeedlessInstall,
  type SeedlessIntegrationHarness,
} from '../../../tests/integration/harnesses/seedless/seedless';

const PASSWORD = 'integration-password';
const KEYRING_ID = 'keyring-1';
// Mobile creates a new wallet on every attempt, so each attempt backs up a different SRP.
const FIRST_ATTEMPT_SRP = new Uint8Array(64).fill(1);
const RETRY_SRP = new Uint8Array(64).fill(2);
const IMPORTED_SRP = new Uint8Array(64).fill(9);
const IMPORTED_PRIVATE_KEY = new Uint8Array(32).fill(7);

const createAccount = async (
  install: SeedlessInstall,
  seedPhrase: Uint8Array,
) =>
  await install.controller.createToprfKeyAndBackupSeedPhrase(
    PASSWORD,
    seedPhrase,
    KEYRING_ID,
  );

/**
 * What `Authentication.createAndBackupSeedPhrase` does after a failure: clear
 * the controller, then the user signs in again. The backend decides whether
 * they create a new account or recover an existing one.
 */
const startOver = async (install: SeedlessInstall) => {
  await install.controller.clearState();
  return await install.signIn();
};

const recoverOnNewInstall = async (harness: SeedlessIntegrationHarness) => {
  const install = harness.newInstall();
  await install.signIn();
  return await install.controller.fetchAllSecretData(PASSWORD);
};

describe('seedless account creation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('recovers the SRP on a new install after a successful creation', async () => {
    const harness = buildSeedlessIntegrationHarness();
    const install = harness.newInstall();
    await install.signIn();

    await createAccount(install, FIRST_ATTEMPT_SRP);
    const secrets = await recoverOnNewInstall(harness);

    expect(secrets[0]?.type).toBe(SecretType.Mnemonic);
    expect(secrets[0]?.data).toStrictEqual(FIRST_ATTEMPT_SRP);
  });

  it('creates a new account on retry when the metadata write fails', async () => {
    const harness = buildSeedlessIntegrationHarness();
    const install = harness.newInstall();
    await install.signIn();
    failNextCall(install, 'addSecretDataItem');

    await expect(createAccount(install, FIRST_ATTEMPT_SRP)).rejects.toThrow();
    const { isNewUser } = await startOver(install);
    await createAccount(install, RETRY_SRP);
    const secrets = await recoverOnNewInstall(harness);

    expect(isNewUser).toBe(true);
    expect(secrets[0]?.data).toStrictEqual(RETRY_SRP);
    expect(harness.backend.namespacesWithSecrets()).toStrictEqual([
      harness.backend.savedKeyNamespace(),
    ]);
  });

  it('recovers the retry SRP when the key-share save fails after the SRP is written', async () => {
    const harness = buildSeedlessIntegrationHarness();
    const install = harness.newInstall();
    await install.signIn();
    failNextCall(install, 'persistLocalKey');

    await expect(createAccount(install, FIRST_ATTEMPT_SRP)).rejects.toThrow();
    const { isNewUser } = await startOver(install);
    await createAccount(install, RETRY_SRP);
    const secrets = await recoverOnNewInstall(harness);

    expect(isNewUser).toBe(true);
    expect(secrets.map((secret) => secret.data)).toStrictEqual([RETRY_SRP]);
  });

  // The controller refreshes the token and repeats the create step, including
  // the SRP write that already landed. The metadata store allows one primary
  // SRP per key, so the repeat is rejected and creation fails. The SRP from
  // that attempt stays under a key SSS never saved.
  it('fails creation and leaves an orphaned SRP when the key-share save hits an expired token', async () => {
    const harness = buildSeedlessIntegrationHarness();
    const install = harness.newInstall();
    await install.signIn();
    failNextCall(install, 'persistLocalKey', authTokenExpiredError());

    await expect(createAccount(install, FIRST_ATTEMPT_SRP)).rejects.toThrow(
      SeedlessOnboardingControllerErrorMessage.FailedToEncryptAndStoreSecretData,
    );

    expect(harness.backend.createdKeyIds).toHaveLength(1);
    expect(harness.backend.persistedKey).toBeUndefined();
    expect(harness.backend.namespacesWithSecrets()).toHaveLength(1);
  });

  it('recovers the retry SRP after creation fails on an expired token', async () => {
    const harness = buildSeedlessIntegrationHarness();
    const install = harness.newInstall();
    await install.signIn();
    failNextCall(install, 'persistLocalKey', authTokenExpiredError());

    await expect(createAccount(install, FIRST_ATTEMPT_SRP)).rejects.toThrow();
    const { isNewUser } = await startOver(install);
    await createAccount(install, RETRY_SRP);
    const secrets = await recoverOnNewInstall(harness);

    expect(isNewUser).toBe(true);
    expect(secrets.map((secret) => secret.data)).toStrictEqual([RETRY_SRP]);
  });

  it('recovers the SRP by signing in again when the local vault write fails', async () => {
    const harness = buildSeedlessIntegrationHarness();
    const install = harness.newInstall();
    await install.signIn();
    jest
      .spyOn(seedlessOnboardingEncryptorAdapter, 'encryptWithDetail')
      .mockRejectedValueOnce(new Error('vault write failed'));

    await expect(createAccount(install, FIRST_ATTEMPT_SRP)).rejects.toThrow();
    const { isNewUser } = await startOver(install);
    const secrets = await install.controller.fetchAllSecretData(PASSWORD);

    expect(isNewUser).toBe(false);
    expect(secrets.map((secret) => secret.data)).toStrictEqual([
      FIRST_ATTEMPT_SRP,
    ]);
  });

  it('recovers the SRP on a fresh install when the app is killed after the key shares are saved', async () => {
    const harness = buildSeedlessIntegrationHarness();
    const install = harness.newInstall();
    await install.signIn();
    loseNextResponse(install, 'persistLocalKey');

    await expect(createAccount(install, FIRST_ATTEMPT_SRP)).rejects.toThrow();
    const freshInstall = harness.newInstall();
    const { isNewUser } = await freshInstall.signIn();
    const secrets = await freshInstall.controller.fetchAllSecretData(PASSWORD);

    expect(isNewUser).toBe(false);
    expect(secrets.map((secret) => secret.data)).toStrictEqual([
      FIRST_ATTEMPT_SRP,
    ]);
  });
});

describe('seedless add secret', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createdAccount = async () => {
    const harness = buildSeedlessIntegrationHarness();
    const install = harness.newInstall();
    await install.signIn();
    await createAccount(install, FIRST_ATTEMPT_SRP);
    return { harness, install };
  };

  describe.each([
    {
      secret: 'imported SRP',
      data: IMPORTED_SRP,
      dataType: EncAccountDataType.ImportedSrp,
    },
    {
      secret: 'imported private key',
      data: IMPORTED_PRIVATE_KEY,
      dataType: EncAccountDataType.ImportedPrivateKey,
    },
  ])('$secret', ({ data, dataType }) => {
    const addSecret = async (install: SeedlessInstall) =>
      await install.controller.addNewSecretData(data, dataType, {
        keyringId: 'keyring-2',
      });

    const storedCount = (harness: SeedlessIntegrationHarness) =>
      harness.backend.metadata
        .get(harness.backend.savedKeyNamespace())
        ?.filter((item) => item.dataType === dataType).length;

    it('adds the secret once when the retry follows a failed write', async () => {
      const { harness, install } = await createdAccount();
      failNextCall(install, 'addSecretDataItem');

      await expect(addSecret(install)).rejects.toThrow();
      await addSecret(install);

      expect(storedCount(harness)).toBe(1);
    });

    // The write landed but the client never saw the response, so the retry
    // writes again. ADR 0004 expects one entry.
    it('writes the secret twice when the retry follows a lost response', async () => {
      const { harness, install } = await createdAccount();
      loseNextResponse(install, 'addSecretDataItem');

      await expect(addSecret(install)).rejects.toThrow();
      await addSecret(install);

      expect(storedCount(harness)).toBe(2);
    });
  });
});
