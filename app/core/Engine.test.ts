import Engine, {
  Engine as EngineClass,
  EngineState,
  TransactionEventPayload,
} from './Engine';
import { backgroundState } from '../util/test/initial-root-state';
import { zeroAddress } from 'ethereumjs-util';
import { createMockAccountsControllerState } from '../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../util/test/network';
import MetaMetrics from './Analytics/MetaMetrics';
import { store } from '../store';
import { MetaMetricsEvents } from './Analytics';
import { NetworkState, RpcEndpointType } from '@metamask/network-controller';
import { Hex } from '@metamask/utils';
import { MarketDataDetails } from '../components/UI/Tokens';
import { TransactionMeta } from '@metamask/transaction-controller';
import { RootState } from '../reducers';
import { MetricsEventBuilder } from './Analytics/MetricsEventBuilder';

jest.unmock('./Engine');
jest.mock('../store', () => ({
  store: { getState: jest.fn(() => ({ engine: {} })) },
}));
jest.mock('../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn().mockReturnValue(false),
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

  // Use this to keep the unit test initial background state fixture up-to-date
  it('matches initial state fixture', () => {
    const engine = Engine.init({});
    const initialBackgroundState = engine.datamodel.state;

    // AssetsContractController is stateless in v37 resulting in an undefined state
    const newBackgroundState = {
      ...backgroundState,
      AssetsContractController: undefined,
    };

    expect(initialBackgroundState).toStrictEqual(newBackgroundState);
  });

  it('setSelectedAccount throws an error if no account exists for the given address', () => {
    const engine = Engine.init(backgroundState);
    const invalidAddress = '0xInvalidAddress';

    expect(() => engine.setSelectedAccount(invalidAddress)).toThrow(
      `No account found for address: ${invalidAddress}`,
    );
  });

  describe('getTotalFiatAccountBalance', () => {
    let engine: EngineClass;
    afterEach(() => engine?.destroyEngineInstance());

    const selectedAddress = '0x9DeE4BF1dE9E3b930E511Db5cEBEbC8d6F855Db0';
    const chainId: Hex = '0x1';
    const ticker = 'ETH';
    const ethConversionRate = 4000; // $4,000 / ETH
    const ethBalance = 1;

    const state: Partial<EngineState> = {
      AccountsController: createMockAccountsControllerState(
        [selectedAddress],
        selectedAddress,
      ),
      AccountTrackerController: {
        accountsByChainId: {
          [chainId]: {
            [selectedAddress]: { balance: (ethBalance * 1e18).toString() },
          },
        },
        accounts: {
          [selectedAddress]: { balance: (ethBalance * 1e18).toString() },
        },
      },
      NetworkController: {
        state: {
          ...mockNetworkState({
            chainId: '0x1',
            id: '0x1',
            nickname: 'mainnet',
            ticker: 'ETH',
            type: RpcEndpointType.Infura,
          }),
        },
        // TODO(dbrans): Investigate why the shape of the NetworkController state in this
        // test is {state: NetworkState} instead of just NetworkState.
      } as unknown as NetworkState,
      CurrencyRateController: {
        currencyRates: {
          [ticker]: {
            conversionRate: ethConversionRate,
            conversionDate: 0,
            usdConversionRate: ethConversionRate,
          },
        },
        currentCurrency: ticker,
      },
    };

    it('calculates when theres no balances', () => {
      engine = Engine.init(state);
      const totalFiatBalance = engine.getTotalFiatAccountBalance();
      expect(totalFiatBalance).toStrictEqual({
        ethFiat: 0,
        ethFiat1dAgo: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
      });
    });

    it('calculates when theres only ETH', () => {
      const ethPricePercentChange1d = 5; // up 5%

      engine = Engine.init({
        ...state,
        TokenRatesController: {
          marketData: {
            [chainId]: {
              [zeroAddress()]: {
                pricePercentChange1d: ethPricePercentChange1d,
              } as MarketDataDetails,
            },
          },
        },
      });

      const totalFiatBalance = engine.getTotalFiatAccountBalance();

      const ethFiat = ethBalance * ethConversionRate;
      expect(totalFiatBalance).toStrictEqual({
        ethFiat,
        ethFiat1dAgo: ethFiat / (1 + ethPricePercentChange1d / 100),
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
      });
    });

    it('calculates when there are ETH and tokens', () => {
      const ethPricePercentChange1d = 5;

      const tokens = [
        {
          address: '0x001',
          balance: 1,
          price: '1',
          pricePercentChange1d: -1,
        },
        {
          address: '0x002',
          balance: 2,
          price: '2',
          pricePercentChange1d: 2,
        },
      ];

      engine = Engine.init({
        ...state,
        TokensController: {
          tokens: tokens.map((token) => ({
            address: token.address,
            balance: token.balance,
            decimals: 18,
            symbol: 'TEST',
          })),
          ignoredTokens: [],
          detectedTokens: [],
          allTokens: {},
          allIgnoredTokens: {},
          allDetectedTokens: {},
        },
        TokenRatesController: {
          marketData: {
            [chainId]: {
              [zeroAddress()]: {
                pricePercentChange1d: ethPricePercentChange1d,
              },
              ...tokens.reduce(
                (acc, token) => ({
                  ...acc,
                  [token.address]: {
                    price: token.price,
                    pricePercentChange1d: token.pricePercentChange1d,
                  },
                }),
                {},
              ),
            },
          },
        },
      });

      const totalFiatBalance = engine.getTotalFiatAccountBalance();

      const ethFiat = ethBalance * ethConversionRate;
      const [tokenFiat, tokenFiat1dAgo] = tokens.reduce(
        ([fiat, fiat1d], token) => {
          const value = Number(token.price) * token.balance * ethConversionRate;
          return [
            fiat + value,
            fiat1d + value / (1 + token.pricePercentChange1d / 100),
          ];
        },
        [0, 0],
      );

      expect(totalFiatBalance).toStrictEqual({
        ethFiat,
        ethFiat1dAgo: ethFiat / (1 + ethPricePercentChange1d / 100),
        tokenFiat,
        tokenFiat1dAgo,
      });
    });
  });
});

describe('Transaction event handlers', () => {
  let engine: EngineClass;

  beforeEach(() => {
    engine = Engine.init({});
    jest.spyOn(MetaMetrics.getInstance(), 'trackEvent').mockImplementation();
    jest.spyOn(store, 'getState').mockReturnValue({} as RootState);
  });

  afterEach(() => {
    engine?.destroyEngineInstance();
    jest.clearAllMocks();
  });

  describe('_handleTransactionFinalizedEvent', () => {
    it('tracks event with basic properties when smart transactions are disabled', async () => {
      const properties = { status: 'confirmed' };
      const transactionEventPayload: TransactionEventPayload = {
        transactionMeta: { hash: '0x123' } as TransactionMeta,
      };

      await engine._handleTransactionFinalizedEvent(
        transactionEventPayload,
        properties,
      );

      const expectedEvent = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.TRANSACTION_FINALIZED,
      )
        .addProperties(properties)
        .build();

      expect(MetaMetrics.getInstance().trackEvent).toHaveBeenCalledWith(
        expectedEvent,
      );
    });

    it('does not process smart transaction metrics if transactionMeta is missing', async () => {
      const properties = { status: 'failed' };
      const transactionEventPayload = {} as TransactionEventPayload;

      await engine._handleTransactionFinalizedEvent(
        transactionEventPayload,
        properties,
      );

      const expectedEvent = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.TRANSACTION_FINALIZED,
      )
        .addProperties(properties)
        .build();

      expect(MetaMetrics.getInstance().trackEvent).toHaveBeenCalledWith(
        expectedEvent,
      );
    });
  });

  describe('Transaction status handlers', () => {
    it('tracks dropped transactions', async () => {
      const transactionEventPayload: TransactionEventPayload = {
        transactionMeta: { hash: '0x123' } as TransactionMeta,
      };

      await engine._handleTransactionDropped(transactionEventPayload);

      const expectedEvent = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.TRANSACTION_FINALIZED,
      )
        .addProperties({ status: 'dropped' })
        .build();

      expect(MetaMetrics.getInstance().trackEvent).toHaveBeenCalledWith(
        expectedEvent,
      );
    });

    it('tracks confirmed transactions', async () => {
      const transactionMeta = { hash: '0x123' } as TransactionMeta;

      await engine._handleTransactionConfirmed(transactionMeta);

      const expectedEvent = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.TRANSACTION_FINALIZED,
      )
        .addProperties({ status: 'confirmed' })
        .build();

      expect(MetaMetrics.getInstance().trackEvent).toHaveBeenCalledWith(
        expectedEvent,
      );
    });

    it('tracks failed transactions', async () => {
      const transactionEventPayload: TransactionEventPayload = {
        transactionMeta: { hash: '0x123' } as TransactionMeta,
      };

      await engine._handleTransactionFailed(transactionEventPayload);

      const expectedEvent = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.TRANSACTION_FINALIZED,
      )
        .addProperties({ status: 'failed' })
        .build();

      expect(MetaMetrics.getInstance().trackEvent).toHaveBeenCalledWith(
        expectedEvent,
      );
    });
  });

  describe('_addTransactionControllerListeners', () => {
    it('subscribes to transaction events', () => {
      jest.spyOn(engine.controllerMessenger, 'subscribe');

      engine._addTransactionControllerListeners();

      expect(engine.controllerMessenger.subscribe).toHaveBeenCalledWith(
        'TransactionController:transactionDropped',
        engine._handleTransactionDropped,
      );
      expect(engine.controllerMessenger.subscribe).toHaveBeenCalledWith(
        'TransactionController:transactionConfirmed',
        engine._handleTransactionConfirmed,
      );
      expect(engine.controllerMessenger.subscribe).toHaveBeenCalledWith(
        'TransactionController:transactionFailed',
        engine._handleTransactionFailed,
      );
    });
  });
});
