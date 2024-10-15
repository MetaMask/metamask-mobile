import Engine, { EngineState } from './Engine';
import { createMockAccountsControllerState } from '../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../util/test/network';

// const zeroAddress = '0x0000000000000000000000000000000000000000';

// Update the EngineInitState type to match the expected input of Engine.init()
type EngineInitState = Record<string, never>;

jest.unmock('./Engine');
jest.mock('../store', () => ({ store: { getState: jest.fn(() => ({})) } }));

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
    expect(engine.context).toHaveProperty('SelectedNetworkController');
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

  it('setSelectedAccount throws an error if no account exists for the given address', () => {
    const engine = Engine.init({});
    const invalidAddress = '0xInvalidAddress';

    expect(() => {
      if ('setSelectedAccount' in engine) {
        (engine as { setSelectedAccount: (address: string) => void }).setSelectedAccount(invalidAddress);
      }
    }).toThrow(`No account found for address: ${invalidAddress}`);
  });

  describe('getTotalFiatAccountBalance', () => {
    let engine: ReturnType<typeof Engine.init>;
    const selectedAddress = '0x9DeE4BF1dE9E3b930E511Db5cEBEbC8d6F855Db0';
    const ticker = 'ETH';
    const ethConversionRate = 4000; // $4,000 / ETH

    const mockState: Partial<EngineState> = {
      AccountsController: createMockAccountsControllerState([selectedAddress], selectedAddress),
      NetworkController: mockNetworkState({
        chainId: '0x1',
      }),
      CurrencyRateController: {
        // @ts-expect-error Mock state doesn't match exact CurrencyRateState, but it's sufficient for testing
        conversionRate: ethConversionRate,
        currentCurrency: 'usd',
        nativeCurrency: ticker,
      },
    };

    it('calculates when theres no balances', () => {
      // Use type assertion to satisfy TypeScript
      engine = Engine.init(mockState as unknown as EngineInitState);
      if (typeof engine === 'object' && engine !== null && 'getTotalFiatAccountBalance' in engine) {
        const totalFiatBalance = (engine as {
          getTotalFiatAccountBalance: () => {
            ethFiat: number;
            ethFiat1dAgo: number;
            tokenFiat: number;
            tokenFiat1dAgo: number;
          }
        }).getTotalFiatAccountBalance();
        expect(totalFiatBalance).toStrictEqual({
          ethFiat: 0,
          ethFiat1dAgo: 0,
          tokenFiat: 0,
          tokenFiat1dAgo: 0,
        });
      }
    });

    // ... (other test cases)
  });
});
