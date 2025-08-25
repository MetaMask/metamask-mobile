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
import { getGlobalEthQuery } from '../util/networks/global-network';
import { getBalance, ZERO_BALANCE } from '../util/importAdditionalAccounts';
import ExtendedKeyringTypes from '../constants/keyringTypes';
import {
  getDefaultNetworkControllerState,
  NetworkController,
} from '@metamask/network-controller';
import { INFURA_PROJECT_ID } from '../constants/network';
import { storePrivacyPolicyClickedOrClosed } from '../reducers/legalNotices';
import { Store } from 'redux';

export const VAULT_INITIALIZED_KEY = '@MetaMask:vaultInitialized';

// Only proceed if both SRP and password are provided
export const seedPhrase = process.env.TEST_SRP;
export const password = process.env.PASSWORD;

const additionalSrps = [
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
    if (!password || !seedPhrase) {
      return null;
    }

    const vaultAndAccount = await generateVaultAndAccount(seedPhrase, password);

    if (!vaultAndAccount) {
      return null;
    }

    const { keyringControllerState } = vaultAndAccount;

    // Mark vault as initialized
    await StorageWrapper.setItem(VAULT_INITIALIZED_KEY, 'true');

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

    // Now create KeyringController with the snap keyring builder
    const keyringController = new KeyringController({
      encryptor,
      messenger: keyringControllerMessenger,
      //      keyringBuilders: [], -> We need it to add snap keyrings
    });

    const networkControllerMessenger = controllerMessenger.getRestricted({
      name: 'NetworkController',
      allowedEvents: [],
      allowedActions: [],
    });

    const networkController = new NetworkController({
      messenger: networkControllerMessenger,
      infuraProjectId: INFURA_PROJECT_ID || '',
      state: getDefaultNetworkControllerState(),
      getBlockTrackerOptions: () => ({}),
      getRpcServiceOptions: () => {
        const commonOptions = {
          // eslint-disable-next-line no-undef
          fetch: globalThis.fetch.bind(globalThis),
          // eslint-disable-next-line no-undef
          btoa: globalThis.btoa.bind(globalThis),
        };

        return {
          ...commonOptions,
        };
      },
    });

    const seedPhraseUint8Array = mnemonicPhraseToBytes(secretRecoveryPhrase);

    // Create vault and restore with seed phrase
    await keyringController.createNewVaultAndRestore(
      newPassword,
      seedPhraseUint8Array,
    );

    await keyringController.submitPassword(newPassword);
    // Create a mapping of SRPs that can be processed at build time by Babel
    for (const srp of additionalSrps) {
      if (!srp) {
        break;
      }

      await keyringController.addNewKeyring(ExtendedKeyringTypes.hd, {
        mnemonic: srp, // Use the actual SRP, not the original seedPhrase
        numberOfAccounts: 1,
      });
    }

    networkController.initializeProvider();

    const ethQuery = getGlobalEthQuery(networkController);

    const allKeyrings = keyringController.getKeyringsByType(
      ExtendedKeyringTypes.hd,
    );

    for (
      let keyringIndex = 0;
      keyringIndex < allKeyrings.length;
      keyringIndex++
    ) {
      await keyringController.withKeyring(
        { type: ExtendedKeyringTypes.hd, index: keyringIndex },
        async ({ keyring }) => {
          // First, check existing accounts in this keyring
          const existingAccounts = await keyring.getAccounts();

          for (const account of existingAccounts) {
            try {
              await getBalance(account, ethQuery);
            } catch (err) {
              //fail silently
            }
          }

          for (let i = 0; i < 9999; i++) {
            const [newAccount] = await keyring.addAccounts(1);
            await keyring.getAccounts();

            let newAccountBalance = ZERO_BALANCE;
            try {
              newAccountBalance = await getBalance(newAccount, ethQuery);
            } catch (error) {
              // Errors are gracefully handled so that `withKeyring`
              // will not rollback the primary keyring, and accounts
              // created in previous loop iterations will remain in place.
            }

            if (newAccountBalance === ZERO_BALANCE) {
              // remove extra zero balance account we just added and break the loop

              keyring.removeAccount?.(newAccount);
              break;
            }
          }
        },
      );
    }

    // Extract vault
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
