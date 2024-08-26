import Engine from './Engine';
import { backgroundState } from '../util/test/initial-root-state';
import { ControllerMessenger } from '@metamask/base-controller';

jest.unmock('./Engine');

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
    expect(engine.context).toHaveProperty('AuthenticationController');
    expect(engine.context).toHaveProperty('UserStorageController');
    expect(engine.context).toHaveProperty('NotificationServicesController');
  });

  it('calling Engine.init twice returns the same instance', () => {
    const engine = Engine.init({});
    const newEngine = Engine.init({});
    expect(engine).toStrictEqual(newEngine);
  });

  it('calling Engine.destroy deletes the old instance', async () => {
    const engine = Engine.init({});
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

  it('should not call updateNFTOwnership', async () => {
    const engine = Engine.init(backgroundState);
    const onFinishedTransactionSpy = jest.spyOn(
      engine,
      'onFinishedTransaction',
    );
    const updateNFTOwnershipSpy = jest.spyOn(engine, 'updateNFTOwnership');
    jest.spyOn(ControllerMessenger.prototype, 'subscribe');
    engine.controllerMessenger.publish(
      'TransactionController:transactionStatusUpdated',
      {
        transactionMeta: { status: 'failed' },
      },
    );
    expect(onFinishedTransactionSpy).toHaveBeenCalledTimes(1);
    expect(updateNFTOwnershipSpy).toHaveBeenCalledTimes(0);
  });

  it('should call updateNFTOwnership when transaction is confirmed', async () => {
    const engine = Engine.init(backgroundState);

    const onFinishedTransactionSpy = jest.spyOn(
      engine,
      'onFinishedTransaction',
    );
    const updateNFTOwnershipSpy = jest.spyOn(engine, 'updateNFTOwnership');
    jest.spyOn(ControllerMessenger.prototype, 'subscribe');
    engine.controllerMessenger.publish(
      'TransactionController:transactionStatusUpdated',
      {
        transactionMeta: { status: 'confirmed' },
      },
    );
    expect(onFinishedTransactionSpy).toHaveBeenCalledTimes(1);
    expect(updateNFTOwnershipSpy).toHaveBeenCalledTimes(1);
  });
});
