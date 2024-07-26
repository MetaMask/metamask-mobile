import Engine from './Engine';
import { backgroundState } from '../util/test/initial-root-state';
import { zeroAddress } from 'ethereumjs-util';

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

  describe('getTotalFiatAccountBalance', () => {
    let engine;
    afterEach(() => engine?.destroyEngineInstance());

    const selectedAddress = '0x123';
    const chainId = '0x1';
    const ticker = 'ETH';
    const ethConversionRate = 4000; // $4,000 / ETH

    const state = {
      PreferencesController: { selectedAddress },
      NetworkController: {
        state: { providerConfig: { chainId, ticker } },
      },
      CurrencyRateController: {
        currencyRates: {
          [ticker]: { conversionRate: ethConversionRate },
        },
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
      const ethBalance = 1; // 1 ETH
      const ethPricePercentChange1d = 5; // up 5%

      engine = Engine.init({
        ...state,
        AccountTrackerController: {
          accountsByChainId: {
            [chainId]: {
              [selectedAddress]: { balance: ethBalance * 1e18 },
            },
          },
        },
        TokenRatesController: {
          marketData: {
            [chainId]: {
              [zeroAddress()]: {
                pricePercentChange1d: ethPricePercentChange1d,
              },
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
      const ethBalance = 1;
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
        AccountTrackerController: {
          accountsByChainId: {
            [chainId]: {
              [selectedAddress]: { balance: ethBalance * 1e18 },
            },
          },
        },
        TokensController: {
          tokens: tokens.map((token) => ({
            address: token.address,
            balance: token.balance,
          })),
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
          const value = token.balance * token.price * ethConversionRate;
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
