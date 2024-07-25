import Engine from './Engine';
import { backgroundState } from '../util/test/initial-root-state';
import { store } from '../store'; // Ensure this import is added

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

  // Test for getTotalFiatAccountBalance
  it('should calculate total fiat account balance correctly', () => {
    // const engine = Engine.init(mockState);
    const mockState = {
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionRate: 2000, // Example rate: 1 ETH = 2000 USD
          },
        },
      },
      PreferencesController: {
        selectedAddress: '0x123',
      },
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            '0x123': {
              balance: '1000000000000000000', // 1 ETH
            },
          },
        },
      },
      TokenBalancesController: {
        contractBalances: {},
      },
      TokenRatesController: {
        marketData: {
          '0x1': {
            '0x0000000000000000000000000000000000000000': {
              pricePercentChange1d: -4.867211076998867, // Example decrease of 4.867211076998867%
            },
          },
        },
      },
      TokensController: {
        tokens: [],
      },
      NetworkController: {
        state: {
          providerConfig: {
            chainId: '0x1',
            ticker: 'eth',
          },
        },
      },
    };

    const engine = Engine.init(mockState);

    // Mock store.getState() to return the above mock state
    store.getState = jest.fn(() => ({
      settings: {
        showFiatOnTestnets: true,
      },
      engine: {
        backgroundState: mockState,
      },
    }));

    const result = engine.getTotalFiatAccountBalance();

    expect(result.ethFiat).toBe(2000);
    expect(result.ethFiat1dAgo).toBeCloseTo(2102.42, 0); // Calculated as 2000 / (1 - 4.867211076998867 / 100)
    expect(result.tokenFiat).toBe(0);
    expect(result.tokenFiat1dAgo).toBe(0);
  });
});
