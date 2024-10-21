import EngineModule, { EngineState } from './Engine';
import { backgroundState } from '../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../util/test/network';
import type { NetworkState, RpcEndpointType } from '@metamask/network-controller';
import type { CurrencyRateState } from '@metamask/assets-controllers';

jest.unmock('./Engine');
jest.mock('../store', () => ({ store: { getState: jest.fn(() => ({})) } }));

// Helper function to create Engine instances
const createEngine = (state: Partial<EngineState> = {}) => EngineModule.init(state as unknown as Record<string, never>);

describe('Engine', () => {
  it('should expose an API', () => {
    const engine = createEngine({});
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

  it('calling Engine twice returns the same instance', () => {
    const engine = createEngine({});
    const newEngine = createEngine({});
    expect(engine).toStrictEqual(newEngine);
  });

  it('calling Engine.destroy deletes the old instance', async () => {
    const engine = createEngine({});
    await engine.destroyEngineInstance();
    const newEngine = createEngine({});
    expect(engine).not.toStrictEqual(newEngine);
  });

  it('matches initial state fixture', () => {
    const engine = createEngine({});
    const initialBackgroundState = engine.datamodel.state;
    expect(initialBackgroundState).toStrictEqual(backgroundState);
  });

  it('setSelectedAccount throws an error if no account exists for the given address', () => {
    const engine = createEngine(backgroundState as unknown as Record<string, never>);
    const invalidAddress = '0xInvalidAddress';
    expect(() => engine.setSelectedAccount(invalidAddress)).toThrow(
      `No account found for address: ${invalidAddress}`,
    );
  });

  describe('getTotalFiatAccountBalance', () => {
    let engine: ReturnType<typeof createEngine> | null = null;
    afterEach(() => engine?.destroyEngineInstance());

    const selectedAddress = '0x9DeE4BF1dE9E3b930E511Db5cEBEbC8d6F855Db0';
    const ticker = 'ETH';
    const ethConversionRate = 4000; // $4,000 / ETH

    const state: Partial<EngineState> = {
      AccountsController: createMockAccountsControllerState(
        [selectedAddress],
        selectedAddress,
      ),
      NetworkController: {
        ...mockNetworkState({
          chainId: '0x1',
          id: '0x1',
          nickname: 'mainnet',
          ticker: 'ETH',
          type: 'mainnet' as RpcEndpointType,
        }),
      } as NetworkState,
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          [ticker]: {
            conversionRate: ethConversionRate,
            conversionDate: null,
            usdConversionRate: null,
          },
        },
      } as CurrencyRateState,
    };

    it('calculates when theres no balances', () => {
      engine = createEngine(state as unknown as Record<string, never>);
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
      const chainId = '0x1';

      engine = createEngine({
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
              '0x0000000000000000000000000000000000000000': {
                pricePercentChange1d: ethPricePercentChange1d,
              },
            },
          },
        },
      } as unknown as Record<string, never>);

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
      const chainId = '0x1';

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

      engine = createEngine({
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
              '0x0000000000000000000000000000000000000000': {
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
                {} as Record<string, { price: string; pricePercentChange1d: number }>,
              ),
            },
          },
        },
      } as unknown as Record<string, never>);

      const totalFiatBalance = engine.getTotalFiatAccountBalance();

      const ethFiat = ethBalance * ethConversionRate;
      const [tokenFiat, tokenFiat1dAgo] = tokens.reduce(
        ([fiat, fiat1d], token) => {
          const value = token.balance * parseFloat(token.price) * ethConversionRate;
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
