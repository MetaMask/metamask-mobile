import type { MoneyAccountControllerState } from '@metamask/money-account-controller';
import { isMoneyAccountEntry } from './isMoneyAccountEntry';

type MoneyAccountsMap = MoneyAccountControllerState['moneyAccounts'];

const makeMoneyAccounts = (addresses: string[]): MoneyAccountsMap =>
  addresses.reduce<MoneyAccountsMap>((acc, address, idx) => {
    acc[`account-${idx}`] = {
      address,
    } as MoneyAccountsMap[string];
    return acc;
  }, {});

describe('isMoneyAccountEntry', () => {
  it('returns false when walletAddress is undefined', () => {
    const moneyAccounts = makeMoneyAccounts(['0xabc']);
    expect(isMoneyAccountEntry(undefined, moneyAccounts)).toBe(false);
  });

  it('returns false when moneyAccounts is empty', () => {
    expect(isMoneyAccountEntry('0xabc', {})).toBe(false);
  });

  it('returns false when no money account matches walletAddress', () => {
    const moneyAccounts = makeMoneyAccounts([
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    ]);
    expect(
      isMoneyAccountEntry(
        '0xcccccccccccccccccccccccccccccccccccccccc',
        moneyAccounts,
      ),
    ).toBe(false);
  });

  it('returns true when a money account matches walletAddress exactly', () => {
    const target = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const moneyAccounts = makeMoneyAccounts([target]);
    expect(isMoneyAccountEntry(target, moneyAccounts)).toBe(true);
  });

  it('matches case-insensitively when walletAddress has mixed case', () => {
    const moneyAccounts = makeMoneyAccounts([
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ]);
    expect(
      isMoneyAccountEntry(
        '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        moneyAccounts,
      ),
    ).toBe(true);
  });

  it('matches case-insensitively when money account address has mixed case', () => {
    const moneyAccounts = makeMoneyAccounts([
      '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
    ]);
    expect(
      isMoneyAccountEntry(
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        moneyAccounts,
      ),
    ).toBe(true);
  });

  it('returns true when walletAddress matches any (not only first) money account', () => {
    const target = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const moneyAccounts = makeMoneyAccounts([
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      target,
      '0xcccccccccccccccccccccccccccccccccccccccc',
    ]);
    expect(isMoneyAccountEntry(target, moneyAccounts)).toBe(true);
  });
});
