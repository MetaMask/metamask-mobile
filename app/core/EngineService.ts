import UntypedEngine from './Engine';
import AppConstants from './AppConstants';

const UPDATE_BG_STATE_KEY = 'UPDATE_BG_STATE';
const INIT_BG_STATE_KEY = 'INIT_BG_STATE';
import { Logtail } from '@logtail/browser';

const logtail = new Logtail('QAszNMAsinmVdwbMLNPpRfr6');

type IController = {
  name: string;
  key?: string;
  lazy?: boolean;
}

class EngineService {
  private engineInitialized = false;
  private lazyControlers: IController[] = [];

  /**
   * Initializer for the EngineService
   *
   * @param store - Redux store
   */
  initalizeEngine = (store: any) => {
    const reduxState = store.getState?.();
    const state = reduxState?.engine?.backgroundState || {};
    const Engine = UntypedEngine as any;

    Engine.init(state);
    
    const controllers: IController[] = [
      { name: 'AccountTrackerController' },
      { name: 'AddressBookController' },
      { name: 'AssetsContractController' },
      { name: 'NftController' },
      { name: 'TokensController' },
      { name: 'TokenDetectionController' },
      { name: 'NftDetectionController' },
      { name: 'KeyringController' },
      { name: 'AccountTrackerController' },
      { name: 'NetworkController' },
      { name: 'PhishingController', lazy: true },
      { name: 'PreferencesController' },
      { name: 'TokenBalancesController' },
      { name: 'TokenRatesController' },
      { name: 'TransactionController' },
      { name: 'TypedMessageManager' },
      { name: 'SwapsController' },
      {
        name: 'TokenListController',
        key: `${Engine.context.TokenListController.name}:stateChange`,
      },
      {
        name: 'CurrencyRateController',
        key: `${Engine.context.CurrencyRateController.name}:stateChange`,
      },
      {
        name: 'GasFeeController',
        key: `${Engine.context.GasFeeController.name}:stateChange`,
      },
      {
        name: 'ApprovalController',
        key: `${Engine.context.ApprovalController.name}:stateChange`,
      },
    ];

    // Save lazy controllers for later
    this.lazyControlers = controllers.filter((controller) => controller.lazy);

    Engine?.datamodel?.subscribe?.(() => {
      if (!this.engineInitialized) {
        store.dispatch({ type: INIT_BG_STATE_KEY });
        this.engineInitialized = true;
      }
    });

    controllers
      .filter((controller) => !controller.lazy)
      .forEach((controller) => 
      this.subscribeControllerBackgroundState(controller, store, Engine));
  };

  subscribeControllerBackgroundState = (controller: IController, store: any, engine: any) => {
    const update_bg_state_cb = () =>
      store.dispatch({ type: UPDATE_BG_STATE_KEY, key: controller.name });

    if (controller.name === 'NetworkController') {
      engine.controllerMessenger.subscribe(
        AppConstants.NETWORK_STATE_CHANGE_EVENT,
        update_bg_state_cb,
      );
      return;
    }

    if (controller.key) {
      engine.controllerMessenger.subscribe(controller.key, update_bg_state_cb)
      return;
    }

    engine.context[controller.name].subscribe(update_bg_state_cb);
  }

  setupLazyControllers = (store: any) => {
    const Engine = UntypedEngine as any;
    this.lazyControlers.forEach((controller) => {
      this.subscribeControllerBackgroundState(controller, store, Engine);
    });
  }
}

/**
 * EngineService class used for initializing and subscribing to the engine controllers
 */
export default new EngineService();
