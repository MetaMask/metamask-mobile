import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import { safeToChecksumAddress } from '../../../../util/address';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useMoneyTransactionDisplayInfo } from './useMoneyTransactionDisplayInfo';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import type { MoneyActivityTitleKey } from '../constants/mockActivityData';

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

  function renderIcon(tx: TransactionMeta): IconName {
    const { result } = renderHookWithProvider(
      () => useMoneyTransactionDisplayInfo(tx, undefined),
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
    return result.current.icon;
  }

  function txWithTitleKey(key: MoneyActivityTitleKey): TransactionMeta {
    return {
      ...baseTx,
      moneyActivityTitleKey: key,
    } as unknown as TransactionMeta;
  }

  function txWithType(type: TransactionType | undefined): TransactionMeta {
    return {
      ...baseTx,
      type,
    } as unknown as TransactionMeta;
  }

  describe('icon', () => {
    it.each<[MoneyActivityTitleKey, IconName]>([
      ['added', IconName.Add],
      ['deposited', IconName.Add],
      ['received', IconName.Arrow2Down],
      ['converted', IconName.Refresh],
      ['transferred', IconName.SwapHorizontal],
      ['card_transaction', IconName.Card],
      ['sent', IconName.Arrow2UpRight],
    ])('maps title key "%s" to %s', (key, expected) => {
      expect(renderIcon(txWithTitleKey(key))).toBe(expected);
    });

    it.each<[TransactionType, IconName]>([
      [TransactionType.moneyAccountDeposit, IconName.Add],
      [TransactionType.incoming, IconName.Arrow2Down],
      [TransactionType.musdConversion, IconName.Refresh],
      [TransactionType.moneyAccountWithdraw, IconName.SwapHorizontal],
      [TransactionType.simpleSend, IconName.Arrow2UpRight],
    ])('falls back to type "%s" mapping %s', (type, expected) => {
      expect(renderIcon(txWithType(type))).toBe(expected);
    });

    it('defaults to Arrow2Down when type is undefined and no title key', () => {
      expect(renderIcon(txWithType(undefined))).toBe(IconName.Arrow2Down);
    });

    it('defaults to Arrow2Down for an unmapped transaction type', () => {
      expect(renderIcon(txWithType(TransactionType.contractInteraction))).toBe(
        IconName.Arrow2Down,
      );
    });

    it('disambiguates moneyAccountWithdraw (no title key) to SwapHorizontal', () => {
      expect(renderIcon(txWithType(TransactionType.moneyAccountWithdraw))).toBe(
        IconName.SwapHorizontal,
      );
    });

    it('disambiguates simpleSend (no title key) to Arrow2UpRight', () => {
      expect(renderIcon(txWithType(TransactionType.simpleSend))).toBe(
        IconName.Arrow2UpRight,
      );
    });

    it('prefers the title key over the transaction type', () => {
      const tx = {
        ...baseTx,
        type: TransactionType.simpleSend,
        moneyActivityTitleKey: 'received',
      } as unknown as TransactionMeta;
      expect(renderIcon(tx)).toBe(IconName.Arrow2Down);
    });
  });
});
