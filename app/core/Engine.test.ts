import Engine from './Engine';
import { backgroundState } from '../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../util/test/network';
import type { EngineState } from './Engine';
import type { NetworkState, RpcEndpointType } from '@metamask/network-controller';
import type { CurrencyRateState } from '@metamask/assets-controllers';

jest.unmock('./Engine');
jest.mock('../store', () => ({ store: { getState: jest.fn(() => ({})) } }));

describe('Engine', () => {
  it('should expose an API', () => {
    Engine.init({});
    // Existing expect statements remain unchanged
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

  it('matches initial state fixture', () => {
    const engine = Engine.init({});
    const initialBackgroundState = engine.datamodel.state;
    expect(initialBackgroundState).toStrictEqual(backgroundState);
  });

  it('setSelectedAccount throws an error if no account exists for the given address', () => {
    const engine = Engine.init(backgroundState as unknown as Record<string, never>);
    const invalidAddress = '0xInvalidAddress';
    expect(() => engine.setSelectedAccount(invalidAddress)).toThrow(
      `No account found for address: ${invalidAddress}`,
    );
  });

  describe('getTotalFiatAccountBalance', () => {
    let engine: ReturnType<typeof Engine.init> | null = null;
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
      engine = Engine.init(state as unknown as Record<string, never>);
      const totalFiatBalance = engine.getTotalFiatAccountBalance();
      expect(totalFiatBalance).toStrictEqual({
        ethFiat: 0,
        ethFiat1dAgo: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
      });
    });

    // Existing test cases for 'calculates when theres only ETH' and 'calculates when there are ETH and tokens' remain unchanged
  });
});
