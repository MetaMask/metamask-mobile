import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import { cardTransactionDisplayInfo } from './cardTransactionDisplayInfo';
import type { CardTransaction } from '../types/moneyActivity';

const card: CardTransaction = {
  hash: '0xabc' as Hex,
  time: 1780574031000,
  chainId: '0x8f',
  token: {
    address: '0x754704bc059f8c67012fed69bc8a327a5aafb603' as Hex,
    symbol: 'USDC',
    decimals: 6,
  },
  amount: '5381986', // 5.381986 USDC
  to: '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e' as Hex,
};

describe('cardTransactionDisplayInfo', () => {
  it('renders an outgoing card row with token + fiat amounts', () => {
    // Act
    const info = cardTransactionDisplayInfo(card, {
      currentCurrency: 'usd',
      usdToCurrentCurrencyRate: 1,
    });

    // Assert
    expect(info.isIncoming).toBe(false);
    expect(info.icon).toBe(IconName.Card);
    expect(info.description).toBeUndefined();
    expect(info.primaryAmount).toBe('-5.38 mUSD');
    expect(info.fiatAmount).toContain('5.38');
    expect(info.fiatAmount.startsWith('-')).toBe(true);
  });

  it('converts the USD-pegged value into the user currency', () => {
    // Act — 2x rate doubles the fiat figure but not the token amount.
    const info = cardTransactionDisplayInfo(card, {
      currentCurrency: 'eur',
      usdToCurrentCurrencyRate: 2,
    });

    // Assert
    expect(info.primaryAmount).toBe('-5.38 mUSD');
    expect(info.fiatAmount).toContain('10.76');
  });
});
