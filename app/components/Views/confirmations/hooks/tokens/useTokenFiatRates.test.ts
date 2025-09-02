import { CHAIN_IDS } from '@metamask/transaction-controller';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { ARBITRUM_USDC_ADDRESS } from '../../external/perps-temp/hooks/usePerpsDepositInit';
import { TokenFiatRateRequest, useTokenFiatRates } from './useTokenFiatRates';

jest.mock('../../../../../util/address', () => ({
  toChecksumAddress: jest.fn((address) => address),
}));

const CHAIN_ID_1_MOCK = '0x123';
const CHAIN_ID_2_MOCK = '0x456';
const ADDRESS_1_MOCK = '0x789';
const ADDRESS_2_MOCK = '0xabc';
const PRICE_1_MOCK = 2;
const PRICE_2_MOCK = 3;
const TICKER_1_MOCK = 'USD';
const TICKER_2_MOCK = 'EUR';
const CONVERSION_RATE_1_MOCK = 4;
const CONVERSION_RATE_2_MOCK = 5;

function runHook({ requests }: { requests: TokenFiatRateRequest[] }) {
  return renderHookWithProvider(() => useTokenFiatRates(requests), {
    state: {
      engine: {
        backgroundState: {
          ...backgroundState,
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {
              [TICKER_1_MOCK]: {
                conversionRate: CONVERSION_RATE_1_MOCK,
              },
              [TICKER_2_MOCK]: {
                conversionRate: CONVERSION_RATE_2_MOCK,
              },
            },
          },
          NetworkController: {
            networkConfigurationsByChainId: {
              [CHAIN_ID_1_MOCK]: {
                nativeCurrency: TICKER_1_MOCK,
              },
              [CHAIN_ID_2_MOCK]: {
                nativeCurrency: TICKER_2_MOCK,
              },
            },
          },
          TokenRatesController: {
            marketData: {
              [CHAIN_ID_1_MOCK]: {
                [ADDRESS_1_MOCK]: {
                  tokenAddress: ADDRESS_1_MOCK,
                  price: PRICE_1_MOCK,
                },
              },
              [CHAIN_ID_2_MOCK]: {
                [ADDRESS_2_MOCK]: {
                  tokenAddress: ADDRESS_2_MOCK,
                  price: PRICE_2_MOCK,
                },
              },
            },
          },
        },
      },
    },
  }).result.current;
}

describe('useTokenFiatRates', () => {
  it('returns fiat rates calculated from price and conversion rate', () => {
    const result = runHook({
      requests: [
        {
          address: ADDRESS_1_MOCK,
          chainId: CHAIN_ID_1_MOCK,
        },
        {
          address: ADDRESS_2_MOCK,
          chainId: CHAIN_ID_2_MOCK,
        },
      ],
    });

    expect(result).toEqual([8, 15]);
  });

  it('returns conversion rate only if token price found', () => {
    const result = runHook({
      requests: [
        {
          address: 'InvalidAddress' as never,
          chainId: CHAIN_ID_1_MOCK,
        },
      ],
    });

    expect(result).toEqual([CONVERSION_RATE_1_MOCK]);
  });

  it('returns fixed exchange rate if Arbitrum USDC and selected currency is USD', () => {
    const result = runHook({
      requests: [
        {
          address: ARBITRUM_USDC_ADDRESS,
          chainId: CHAIN_IDS.ARBITRUM,
        },
      ],
    });

    expect(result).toEqual([1]);
  });
});
