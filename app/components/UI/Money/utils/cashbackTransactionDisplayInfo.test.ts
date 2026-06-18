import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import { cashbackTransactionDisplayInfo } from './cashbackTransactionDisplayInfo';
import type { CashbackTransaction } from '../types/moneyActivity';

const cashback: CashbackTransaction = {
  hash: '0xabc' as Hex,
  time: 1780574031000,
  chainId: '0x8f',
  token: {
    address: '0x754704bc059f8c67012fed69bc8a327a5aafb603' as Hex,
    symbol: 'mUSD',
    decimals: 6,
  },
  amount: '300000', // 0.30 mUSD
  from: '0xfe80eea4249a1f01095d35e0cf4f37367976a9f0' as Hex,
};

describe('cashbackTransactionDisplayInfo', () => {
  it('renders an incoming cashback row with token + fiat amounts', () => {
    // Act
    const info = cashbackTransactionDisplayInfo(cashback, {
      currentCurrency: 'usd',
      usdToCurrentCurrencyRate: 1,
    });

    // Assert
    expect(info.isIncoming).toBe(true);
    expect(info.icon).toBe(IconName.Card);
    expect(info.description).toBeUndefined();
    expect(info.primaryAmount).toBe('+0.30 mUSD');
    expect(info.fiatAmount).toContain('0.30');
    expect(info.fiatAmount.startsWith('+')).toBe(true);
  });

  it('converts the USD-pegged value into the user currency', () => {
    // Act — 2x rate doubles the fiat figure but not the token amount.
    const info = cashbackTransactionDisplayInfo(cashback, {
      currentCurrency: 'eur',
      usdToCurrentCurrencyRate: 2,
    });

    // Assert
    expect(info.primaryAmount).toBe('+0.30 mUSD');
    expect(info.fiatAmount).toContain('0.60');
  });

  it('omits the fiat amount when no conversion rate is available', () => {
    // Act
    const info = cashbackTransactionDisplayInfo(cashback, {
      currentCurrency: 'usd',
    });

    // Assert
    expect(info.fiatAmount).toBe('');
  });
});
