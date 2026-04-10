import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { safeToChecksumAddress } from '../../../../util/address';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useMoneyTransactionDisplayInfo } from './useMoneyTransactionDisplayInfo';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';

const MOCK_CHAIN: Hex = '0x1';
const checksumToken = safeToChecksumAddress(MUSD_TOKEN_ADDRESS) as string;

const baseTx = {
  id: 'tx-1',
  type: TransactionType.incoming,
  chainId: MOCK_CHAIN,
  transferInformation: {
    amount: '1000000000',
    symbol: 'mUSD',
    decimals: 6,
    contractAddress: MUSD_TOKEN_ADDRESS,
  },
} as unknown as TransactionMeta;

function tokenMarketState(tokenPrice: number) {
  return {
    marketData: {
      [MOCK_CHAIN]: {
        [checksumToken]: { price: tokenPrice },
      },
    },
  };
}

describe('useMoneyTransactionDisplayInfo', () => {
  it('formats fiat in USD when current currency is USD', () => {
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(baseTx, undefined),
      {
        state: {
          engine: {
            backgroundState: {
              CurrencyRateController: {
                currentCurrency: 'usd',
                currencyRates: {
                  ETH: {
                    conversionRate: 3000,
                    usdConversionRate: 3000,
                    conversionDate: null,
                  },
                },
              },
              TokenRatesController: tokenMarketState(1 / 3000),
            },
          },
        },
      },
    );

    expect(result.current.fiatAmount).toMatch(/^\+/);
    expect(result.current.fiatAmount).toMatch(/1,000\.00/);
    expect(result.current.primaryAmount).toMatch(/1,000\.00/);
    expect(result.current.primaryAmount).toContain('mUSD');
  });

  it('uses token market rate and ETH→fiat for non-USD', () => {
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(baseTx, undefined),
      {
        state: {
          engine: {
            backgroundState: {
              CurrencyRateController: {
                currentCurrency: 'eur',
                currencyRates: {
                  ETH: {
                    conversionRate: 2300,
                    usdConversionRate: 2500,
                    conversionDate: null,
                  },
                },
              },
              TokenRatesController: tokenMarketState(0.0004),
            },
          },
        },
      },
    );

    expect(result.current.fiatAmount).toMatch(/^\+/);
    expect(result.current.fiatAmount).toMatch(/920/);
    expect(result.current.primaryAmount).toMatch(/1,000\.00/);
    expect(result.current.primaryAmount).toContain('mUSD');
  });
});
