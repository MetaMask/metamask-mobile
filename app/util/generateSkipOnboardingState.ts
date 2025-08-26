import {
  KeyringController,
  KeyringControllerState,
} from '@metamask/keyring-controller';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';
import { Encryptor } from '../core/Encryptor/Encryptor';
import { DERIVATION_OPTIONS_MINIMUM_OWASP2023 } from '../core/Encryptor/constants';
import StorageWrapper from '../store/storage-wrapper';
import { seedphraseBackedUp, setExistingUser } from '../actions/user';
import { ExtendedControllerMessenger } from '../core/ExtendedControllerMessenger';
import {
  OPTIN_META_METRICS_UI_SEEN,
  SOLANA_FEATURE_MODAL_SHOWN,
  TRUE,
  USE_TERMS,
} from '../constants/storage';
import { storePrivacyPolicyClickedOrClosed } from '../reducers/legalNotices';
import { Store } from 'redux';

export const VAULT_INITIALIZED_KEY = '@MetaMask:vaultInitialized';

// No balance SRP
export const seedPhrase =
  'tip merge tell borrow disease fork lyrics base glance exotic woman sorry';
export const predefinedPassword = process.env.PREDEFINED_PASSWORD;

export const additionalSrps = [
  process.env.TEST_SRP_2,
  process.env.TEST_SRP_3,
  process.env.TEST_SRP_4,
  process.env.TEST_SRP_5,
  process.env.TEST_SRP_6,
  process.env.TEST_SRP_7,
  process.env.TEST_SRP_8,
  process.env.TEST_SRP_9,
  process.env.TEST_SRP_10,
  process.env.TEST_SRP_11,
  process.env.TEST_SRP_12,
  process.env.TEST_SRP_13,
  process.env.TEST_SRP_14,
  process.env.TEST_SRP_15,
  process.env.TEST_SRP_16,
  process.env.TEST_SRP_17,
  process.env.TEST_SRP_18,
  process.env.TEST_SRP_19,
  process.env.TEST_SRP_20,
];

/**
 * Initializes a vault with SRP and password on first app launch only
 * This allows developers and PMs to have a pre-configured wallet ready for login
 */
async function initializeVaultOnFirstLaunch() {
  try {
    if (!predefinedPassword) {
      return null;
    }

    const vaultAndAccount = await generateVaultAndAccount(
      seedPhrase,
      predefinedPassword,
    );

    if (!vaultAndAccount) {
      return null;
    }

    const { keyringControllerState } = vaultAndAccount;

    return {
      keyringControllerState,
    };
  } catch (error) {
    return null;
  }
}

async function generateVaultAndAccount(
  secretRecoveryPhrase: string,
  newPassword: string,
): Promise<{ keyringControllerState: KeyringControllerState } | null> {
  try {
    const controllerMessenger = new ExtendedControllerMessenger();

    const keyringControllerMessenger = controllerMessenger.getRestricted({
      name: 'KeyringController',
      allowedActions: [],
      allowedEvents: [],
    });
    const encryptor = new Encryptor({
      keyDerivationOptions: DERIVATION_OPTIONS_MINIMUM_OWASP2023,
    });

    const keyringController = new KeyringController({
      encryptor,
      messenger: keyringControllerMessenger,
    });

    const seedPhraseUint8Array = mnemonicPhraseToBytes(secretRecoveryPhrase);

    // Create vault and restore with seed phrase
    await keyringController.createNewVaultAndRestore(
      newPassword,
      seedPhraseUint8Array,
    );

    const keyringControllerState = keyringController.state;

    return { keyringControllerState };
  } catch (error) {
    return null;
  }
}

/**
 * Apply the vault initialization to Redux store and return vault data if needed
 * This should be called during EngineService startup
 */
async function applyVaultInitialization(store: Store) {
  const keyringControllerState = await initializeVaultOnFirstLaunch();

  if (keyringControllerState) {
    // Set existing user flag to show login screen
    store.dispatch(setExistingUser(true));
    // removes the necessity of the user to see the protect your wallet modal
    store.dispatch(seedphraseBackedUp());
    // removes the necessity of the user to see the privacy policy modal
    store.dispatch(storePrivacyPolicyClickedOrClosed());

    // removes the necessity of the user to see the solana feature modal
    await StorageWrapper.setItem(SOLANA_FEATURE_MODAL_SHOWN, 'true');
    // removes the necessity of the user to see the terms of use modal
    await StorageWrapper.setItem(USE_TERMS, TRUE);

    // removes the necessity of the user to see the opt-in metrics modal
    await StorageWrapper.setItem(OPTIN_META_METRICS_UI_SEEN, TRUE);

    return keyringControllerState.keyringControllerState;
  }

  return null;
}

export {
  initializeVaultOnFirstLaunch,
  applyVaultInitialization,
  generateVaultAndAccount,
};
