import {
  KeyringController,
  //   KeyringControllerState,
  //   KeyringControllerActions,
  //   KeyringControllerEvents,
  //   KeyringTypes,
} from '@metamask/keyring-controller';
import { MetaMaskKeyring as QRHardwareKeyring } from '@keystonehq/metamask-airgapped-keyring';
import {
  LedgerKeyring,
  LedgerMobileBridge,
  LedgerTransportMiddleware,
} from '@metamask/eth-ledger-bridge-keyring';
import {
  PreferencesController,
  //   PreferencesControllerActions,
  //   PreferencesControllerEvents,
  //   PreferencesState,
} from '@metamask/preferences-controller';
import AppConstants from '../AppConstants';
import { ExtendedControllerMessenger } from '../ExtendedControllerMessenger';
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from '../Encryptor';

const CONTROLLER_MESSENGER_CONTROLLER = 'ControllerMessenger';
const PREFERENCES_CONTROLLER = 'PreferencesController';
const KEYRING_CONTROLLER = 'KeyringController';

class Heart {
  context: Record<string, any> = {};
  store: any;

  initialize = (store: any) => {
    this.store = store;
    this.initializeControllerMessenger();
    this.initializePreferencesController();
    this.initializeKeyringController();
  };

  initializeControllerMessenger = () => {
    const controllerMessenger = new ExtendedControllerMessenger();

    this.context[CONTROLLER_MESSENGER_CONTROLLER] = controllerMessenger;
  };

  initializePreferencesController = () => {
    const controllerMessengerController: ExtendedControllerMessenger<any, any> =
      this.context[CONTROLLER_MESSENGER_CONTROLLER];

    const persistedPreferencesControllerState =
      this.getStoreBackgroundState()?.PreferencesController;

    const preferencesController = new PreferencesController({
      messenger: controllerMessengerController.getRestricted({
        name: 'PreferencesController',
        allowedActions: [],
        allowedEvents: ['KeyringController:stateChange'],
      }),
      state: {
        ipfsGateway: AppConstants.IPFS_DEFAULT_GATEWAY_URL,
        useTokenDetection:
          persistedPreferencesControllerState?.useTokenDetection ?? true,
        useNftDetection: true,
        displayNftMedia: true,
        securityAlertsEnabled: true,
        ...persistedPreferencesControllerState,
      },
    });

    this.context[PREFERENCES_CONTROLLER] = preferencesController;
  };

  initializeKeyringController = () => {
    const controllerMessengerController: ExtendedControllerMessenger<any, any> =
      this.context[CONTROLLER_MESSENGER_CONTROLLER];

    const preferencesController: PreferencesController =
      this.context[PREFERENCES_CONTROLLER];

    const persistedKeyringControllerState =
      this.getStoreBackgroundState()?.KeyringController;

    const encryptor = new Encryptor({
      keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
    });

    const qrKeyringBuilder = () => {
      const keyring = new QRHardwareKeyring();
      // to fix the bug in #9560, forgetDevice will reset all keyring properties to default.
      keyring.forgetDevice();
      return keyring;
    };
    qrKeyringBuilder.type = QRHardwareKeyring.type;

    const bridge = new LedgerMobileBridge(new LedgerTransportMiddleware());
    const ledgerKeyringBuilder = () => new LedgerKeyring({ bridge });
    ledgerKeyringBuilder.type = LedgerKeyring.type;
    const keyringController = new KeyringController({
      removeIdentity: preferencesController.removeIdentity.bind(
        preferencesController,
      ),
      encryptor,
      messenger: controllerMessengerController.getRestricted({
        name: 'KeyringController',
        allowedActions: [],
        allowedEvents: [],
      }),
      state: persistedKeyringControllerState,
      // @ts-expect-error To Do: Update the type of QRHardwareKeyring to Keyring<Json>
      keyringBuilders: [qrKeyringBuilder, ledgerKeyringBuilder],
    });

    this.context[KEYRING_CONTROLLER] = keyringController;
  };

  getStoreBackgroundState = () => {
    return this.store?.getState?.().engine?.backgroundState;
  };

  resetState = () => {};
}

export default new Heart();
