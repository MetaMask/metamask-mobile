import { ControllerMessenger } from '@metamask/base-controller';
import { KeyringController } from '@metamask/keyring-controller';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';
import { Encryptor } from './app/core/Encryptor/Encryptor';
import { DERIVATION_OPTIONS_MINIMUM_OWASP2023 } from './app/core/Encryptor/constants';
import StorageWrapper from './app/store/storage-wrapper';
import { setExistingUser } from './app/actions/user';
import Logger from './app/util/Logger';

// Default test seed phrase - commonly used in MetaMask testing
const E2E_SRP = 'test test test test test test test test test test test junk';

// Storage key to track if vault has been initialized
export const VAULT_INITIALIZED_KEY = '@MetaMask:vaultInitialized';

// Only proceed if both SRP and password are provided
export const seedPhrase = process.env.TEST_SRP || E2E_SRP;
export const password = process.env.PASSWORD;

/**
 * Initializes a vault with SRP and password on first app launch only
 * This allows developers and PMs to have a pre-configured wallet ready for login
 */
async function initializeVaultOnFirstLaunch() {
  try {
    if (!password) {
      Logger.log(
        'No PASSWORD environment variable provided, skipping vault initialization',
      );
      return null;
    }

    Logger.log('Initializing vault for first launch...');

    // Generate the vault
    const { vault } = await generateVaultAndAccount(seedPhrase, password);

    // Mark vault as initialized
    await StorageWrapper.setItem(VAULT_INITIALIZED_KEY, 'true');

    Logger.log('Vault initialized successfully');

    return {
      vault,
      existingUser: true, // This will show login screen instead of onboarding
    };
  } catch (error) {
    Logger.error(error, 'Failed to initialize vault');
    return null;
  }
}

async function generateVaultAndAccount(seedPhrase, password) {
  // Create controller messenger
  const controllerMessenger = new ControllerMessenger();
  const keyringControllerMessenger = controllerMessenger.getRestricted({
    name: 'KeyringController',
  });

  // Create encryptor with proper OWASP2023 settings
  const encryptor = new Encryptor({
    keyDerivationOptions: DERIVATION_OPTIONS_MINIMUM_OWASP2023,
  });

  // Create KeyringController
  const keyringController = new KeyringController({
    encryptor,
    messenger: keyringControllerMessenger,
  });

  // Convert seed phrase to proper format using MetaMask's utility
  const seedPhraseUint8Array = mnemonicPhraseToBytes(seedPhrase);

  // Create vault and restore with seed phrase
  const result = await keyringController.createNewVaultAndRestore(
    password,
    seedPhraseUint8Array,
  );

  // Extract vault
  const { vault } = keyringController.state;

  return { vault };
}

/**
 * Apply the vault initialization to Redux store and return vault data if needed
 * This should be called during EngineService startup
 */
async function applyVaultInitialization(store) {
  const vaultData = await initializeVaultOnFirstLaunch();

  if (vaultData) {
    // Set existing user flag to show login screen
    store.dispatch(setExistingUser(true));

    Logger.log('Applied vault initialization to Redux store');
    return vaultData.vault; // Return the vault to be used in Engine initialization
  }

  return null;
}

export {
  initializeVaultOnFirstLaunch,
  applyVaultInitialization,
  generateVaultAndAccount,
  E2E_SRP,
};
