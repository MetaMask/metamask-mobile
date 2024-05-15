import EngineService from './EngineService';
import Engine from '../Engine';
import { store } from '../../store';

jest.mock('../../util/test/network-store.js', () => jest.fn());
jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      engine: {
        backgroundState: {},
      },
    })),
    dispatch: jest.fn(),
  },
}));

jest.mock('../Engine', () => {
  // Do not need to mock entire Engine. Only need subset of data for testing purposes.
  let instance: any;
  return {
    get context() {
      if (!instance) {
        throw new Error('Engine does not exist');
      }
      return instance.context;
    },
    get controllerMessenger() {
      if (!instance) {
        throw new Error('Engine does not exist');
      }
      return instance.controllerMessenger;
    },
    destroyEngine: jest.fn(),
    init: jest.fn((_, keyringState) => {
      instance = {
        controllerMessenger: { subscribe: jest.fn() },
        context: {
          AddressBookController: { subscribe: jest.fn() },
          KeyringController: {
            subscribe: jest.fn(),
            state: { ...keyringState },
          },
          AssetsContractController: { subscribe: jest.fn() },
          NftController: { subscribe: jest.fn() },
          TokensController: { subscribe: jest.fn() },
          TokenDetectionController: { subscribe: jest.fn() },
          NftDetectionController: { subscribe: jest.fn() },
          AccountTrackerController: { subscribe: jest.fn() },
          NetworkController: { subscribe: jest.fn() },
          PhishingController: { subscribe: jest.fn() },
          PreferencesController: { subscribe: jest.fn() },
          TokenBalancesController: { subscribe: jest.fn() },
          TokenRatesController: { subscribe: jest.fn() },
          TransactionController: { subscribe: jest.fn() },
          SmartTransactionsController: { subscribe: jest.fn() },
          SwapsController: { subscribe: jest.fn() },
          TokenListController: { subscribe: jest.fn() },
          CurrencyRateController: { subscribe: jest.fn() },
          GasFeeController: { subscribe: jest.fn() },
          ApprovalController: { subscribe: jest.fn() },
          PermissionController: { subscribe: jest.fn() },
          LoggingController: { subscribe: jest.fn() },
          AccountsController: { subscribe: jest.fn() },
          SnapController: { subscribe: jest.fn() },
          SubjectMetadataController: { subscribe: jest.fn() },
          PPOMController: { subscribe: jest.fn() },
        },
      };
      return instance;
    }),
  };
});

describe('EngineService', () => {
  EngineService.initalizeEngine(store);
  it('should have Engine initialized', () => {
    expect(Engine.context).toBeDefined();
  });
  it('should have recovered vault on redux store ', async () => {
    const { success } = await EngineService.initializeVaultFromBackup();
    expect(success).toBeTruthy();
    expect(Engine.context.KeyringController.state.vault).toBeDefined();
  });
});
