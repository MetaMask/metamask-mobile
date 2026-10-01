import {
  getWalletLockExpiredRoute,
  getWalletLockedAt,
  resetWalletLockedAtForTesting,
  setWalletLockExpiredRoute,
  setWalletLockedAt,
} from './walletLockClock';

describe('walletLockClock', () => {
  beforeEach(() => {
    resetWalletLockedAtForTesting();
  });

  it('stores lockedAt and the expired route independently', () => {
    setWalletLockedAt(1_000);
    setWalletLockExpiredRoute('PerpsMarketDetails');

    expect(getWalletLockedAt()).toBe(1_000);
    expect(getWalletLockExpiredRoute()).toBe('PerpsMarketDetails');
  });

  it('clears the expired route when the lock session ends', () => {
    setWalletLockedAt(1_000);
    setWalletLockExpiredRoute('PerpsMarketDetails');

    setWalletLockedAt(null);

    expect(getWalletLockedAt()).toBeNull();
    expect(getWalletLockExpiredRoute()).toBeNull();
  });

  it('keeps the expired route while lockedAt is only re-stamped', () => {
    setWalletLockedAt(1_000);
    setWalletLockExpiredRoute('PerpsMarketDetails');

    setWalletLockedAt(2_000);

    expect(getWalletLockExpiredRoute()).toBe('PerpsMarketDetails');
  });
});
