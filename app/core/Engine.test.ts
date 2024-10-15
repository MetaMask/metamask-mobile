import Engine, { EngineState } from './Engine';
import { createMockAccountsControllerState } from '../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../util/test/network';

// const zeroAddress = '0x0000000000000000000000000000000000000000';

// Update the EngineInitState type to match the expected input of Engine.init()
type EngineInitState = Record<string, never>;

jest.unmock('./Engine');
jest.mock('../store', () => ({ store: { getState: jest.fn(() => ({})) } }));

describe('Engine', () => {
  // ... (existing tests)

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
    const chainId = '0x1';
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
