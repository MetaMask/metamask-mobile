import Engine from './Engine';
import { backgroundState } from '../util/test/initial-root-state';

jest.unmock('./Engine');

jest.mock('@metamask/snaps-controllers', () => ({
  ...jest.requireActual('@metamask/snaps-controllers'),
  JsonSnapsRegistry: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    update: jest.fn(),
  })),
  SnapController: jest.fn().mockImplementation(() => ({
    addSnap: jest.fn(),
    removeSnap: jest.fn(),
    getSnap: jest.fn(),
    updateSnap: jest.fn(),
    enableSnap: jest.fn(),
    disableSnap: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getTransactions: jest.fn().mockReturnThis(),
  })),
}));

// Add mock for TransactionController
jest.mock('../core/TransactionController', () => ({
  TransactionController: jest.fn().mockImplementation(() => ({
    getTransactions: jest.fn().mockReturnThis(),
    // Add other necessary methods here
  })),
}));

describe('Engine', () => {
  it('should expose an API', () => {
    const engine = Engine.init({});
    expect(engine.context).toHaveProperty('AccountTrackerController');
    expect(engine.context).toHaveProperty('AddressBookController');
    expect(engine.context).toHaveProperty('AssetsContractController');
    expect(engine.context).toHaveProperty('TokenListController');
    expect(engine.context).toHaveProperty('TokenDetectionController');
    expect(engine.context).toHaveProperty('NftDetectionController');
    expect(engine.context).toHaveProperty('NftController');
    expect(engine.context).toHaveProperty('CurrencyRateController');
    expect(engine.context).toHaveProperty('KeyringController');
    expect(engine.context).toHaveProperty('NetworkController');
    expect(engine.context).toHaveProperty('PhishingController');
    expect(engine.context).toHaveProperty('PreferencesController');
    expect(engine.context).toHaveProperty('SignatureController');
    expect(engine.context).toHaveProperty('TokenBalancesController');
    expect(engine.context).toHaveProperty('TokenRatesController');
    expect(engine.context).toHaveProperty('TokensController');
    expect(engine.context).toHaveProperty('LoggingController');
    expect(engine.context).toHaveProperty('TransactionController');
    expect(engine.context).toHaveProperty('SmartTransactionsController');
  });

  it('calling Engine.init twice returns the same instance', () => {
    const engine = Engine.init({});
    const newEngine = Engine.init({});
    expect(engine).toStrictEqual(newEngine);
  });

  it('calling Engine.destroy deletes the old instance', async () => {
    const engine = Engine.init({});
    expect(engine.context.TransactionController).toBeDefined();
    await engine.destroyEngineInstance();
    const newEngine = Engine.init({});
    expect(engine).not.toStrictEqual(newEngine);
  });

  // Use this to keep the unit test initial background state fixture up-to-date
  it('matches initial state fixture', () => {
    const engine = Engine.init({});
    const initialBackgroundState = engine.datamodel.state;

    expect(initialBackgroundState).toStrictEqual({
      ...backgroundState,

      // JSON cannot store the value undefined, so we append it here
      SmartTransactionsController: {
        smartTransactionsState: {
          fees: {
            approvalTxFees: undefined,
            tradeTxFees: undefined,
          },
          feesByChainId: {
            '0x1': {
              approvalTxFees: undefined,
              tradeTxFees: undefined,
            },
            '0xaa36a7': {
              approvalTxFees: undefined,
              tradeTxFees: undefined,
            },
          },
          liveness: true,
          livenessByChainId: {
            '0x1': true,
            '0xaa36a7': true,
          },
          smartTransactions: {
            '0x1': [],
          },
          userOptIn: undefined,
          userOptInV2: undefined,
        },
      },
    });
  });

  it('setSelectedAccount throws an error if no account exists for the given address', () => {
    const engine = Engine.init(backgroundState);
    const invalidAddress = '0xInvalidAddress';

    expect(() => engine.setSelectedAccount(invalidAddress)).toThrow(
      `No account found for address: ${invalidAddress}`,
    );
  });
});