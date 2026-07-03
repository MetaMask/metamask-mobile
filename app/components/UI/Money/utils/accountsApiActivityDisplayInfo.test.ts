import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import { accountsApiActivityDisplayInfo } from './accountsApiActivityDisplayInfo';
import type { AccountsApiActivity } from '../types/moneyActivity';

const token = {
  address: '0x754704bc059f8c67012fed69bc8a327a5aafb603' as Hex,
  symbol: 'mUSD',
  decimals: 6,
};

const card: AccountsApiActivity = {
  kind: 'card',
  hash: '0xabc' as Hex,
  time: 1780574031000,
  chainId: '0x8f',
  token,
  amount: '5381986', // 5.381986
  paidTo: '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e' as Hex,
};

const cashback: AccountsApiActivity = {
  kind: 'cashback',
  hash: '0xdef' as Hex,
  time: 1780574031000,
  chainId: '0x8f',
  token,
  amount: '300000', // 0.30
  receivedFrom: '0xfe80eea4249a1f01095d35e0cf4f37367976a9f0' as Hex,
};

describe('accountsApiActivityDisplayInfo', () => {
  it('renders a card spend as an outgoing row (negative, Card icon)', () => {
    const info = accountsApiActivityDisplayInfo(card);

    expect(info.isIncoming).toBe(false);
    expect(info.icon).toBe(IconName.Card);
    expect(info.label).toBe('Purchase');
    expect(info.description).toBe('Card');
    expect(info.primaryAmount).toBe('-5.38 mUSD');
    expect(info.fiatAmount).toBe('-$5.38');
  });

  it('renders a cashback credit as an incoming row (positive)', () => {
    const info = accountsApiActivityDisplayInfo(cashback);

    expect(info.isIncoming).toBe(true);
    expect(info.icon).toBe(IconName.Card);
    expect(info.label).toBe('mUSD back');
    expect(info.description).toBe('Card');
    expect(info.primaryAmount).toBe('+0.30 mUSD');
    expect(info.fiatAmount).toBe('+$0.30');
  });

  it('always shows the fiat amount in USD, regardless of preferred currency', () => {
    // mUSD is USD-pegged; the fiat line is dollars with proper $ formatting.
    const info = accountsApiActivityDisplayInfo(cashback);

    expect(info.primaryAmount).toBe('+0.30 mUSD');
    expect(info.fiatAmount).toBe('+$0.30');
  });
});
