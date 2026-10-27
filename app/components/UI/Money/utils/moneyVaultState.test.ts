import { getMoneyVaultState } from './moneyVaultState';

const BASE_VAULT = '0xBaseVault';
const PREMIUM_VAULT = '0xPremiumVault';

const position = ({
  vaultAddress,
  vaultKey,
  usd,
}: {
  vaultAddress?: string;
  vaultKey?: string;
  usd: string;
}) => ({
  vault_address: vaultAddress,
  vault_key: vaultKey,
  current_value_usd: usd,
});

describe('getMoneyVaultState', () => {
  describe('when positions are unavailable', () => {
    it('falls back to premium when entitled', () => {
      expect(
        getMoneyVaultState({
          isEntitled: true,
          positions: undefined,
          baseVaultAddress: BASE_VAULT,
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: 0.05,
          premiumApyDecimal: 0.08,
          positionsUnavailable: true,
        }),
      ).toEqual({
        status: 'premium',
        currentVault: 'premium',
        effectiveApyDecimal: 0.08,
        usesBaseApy: false,
      });
    });

    it('falls back to base when not entitled', () => {
      expect(
        getMoneyVaultState({
          isEntitled: false,
          positions: undefined,
          baseVaultAddress: BASE_VAULT,
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: 0.05,
          premiumApyDecimal: 0.08,
        }),
      ).toEqual({
        status: 'base',
        currentVault: 'base',
        effectiveApyDecimal: 0.05,
        usesBaseApy: true,
      });
    });
  });

  describe('when not entitled', () => {
    it('returns base when funds are in the base vault', () => {
      expect(
        getMoneyVaultState({
          isEntitled: false,
          positions: [
            position({
              vaultAddress: BASE_VAULT,
              vaultKey: 'standard',
              usd: '100',
            }),
          ],
          baseVaultAddress: BASE_VAULT,
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: 0.05,
          premiumApyDecimal: 0.08,
        }),
      ).toEqual({
        status: 'base',
        currentVault: 'base',
        effectiveApyDecimal: 0.05,
        usesBaseApy: true,
      });
    });

    it('returns base when there are no funds', () => {
      expect(
        getMoneyVaultState({
          isEntitled: false,
          positions: [],
          baseVaultAddress: BASE_VAULT,
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: 0.05,
          premiumApyDecimal: 0.08,
        }),
      ).toEqual({
        status: 'base',
        currentVault: 'base',
        effectiveApyDecimal: 0.05,
        usesBaseApy: true,
      });
    });

    it('returns downgrading when funds are still in the premium vault', () => {
      expect(
        getMoneyVaultState({
          isEntitled: false,
          positions: [
            position({
              vaultAddress: PREMIUM_VAULT,
              vaultKey: 'premium',
              usd: '100',
            }),
          ],
          baseVaultAddress: BASE_VAULT,
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: 0.05,
          premiumApyDecimal: 0.08,
        }),
      ).toEqual({
        status: 'downgrading',
        currentVault: 'premium',
        effectiveApyDecimal: 0.08,
        usesBaseApy: false,
      });
    });

    it('returns a weighted APY when funds are split during downgrade', () => {
      expect(
        getMoneyVaultState({
          isEntitled: false,
          positions: [
            position({
              vaultAddress: BASE_VAULT,
              vaultKey: 'standard',
              usd: '25',
            }),
            position({
              vaultAddress: PREMIUM_VAULT,
              vaultKey: 'premium',
              usd: '75',
            }),
          ],
          baseVaultAddress: BASE_VAULT,
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: 0.04,
          premiumApyDecimal: 0.08,
        }),
      ).toEqual({
        status: 'downgrading',
        currentVault: 'premium',
        effectiveApyDecimal: 0.07,
        usesBaseApy: true,
      });
    });

    it('leaves the effective APY unset when a split downgrade is missing the base rate', () => {
      expect(
        getMoneyVaultState({
          isEntitled: false,
          positions: [
            position({
              vaultAddress: BASE_VAULT,
              vaultKey: 'standard',
              usd: '25',
            }),
            position({
              vaultAddress: PREMIUM_VAULT,
              vaultKey: 'premium',
              usd: '75',
            }),
          ],
          baseVaultAddress: BASE_VAULT,
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: undefined,
          premiumApyDecimal: 0.08,
        }),
      ).toEqual({
        status: 'downgrading',
        currentVault: 'premium',
        effectiveApyDecimal: undefined,
        usesBaseApy: true,
      });
    });
  });

  describe('when entitled', () => {
    it('returns premium when funds are only in the premium vault', () => {
      expect(
        getMoneyVaultState({
          isEntitled: true,
          positions: [
            position({
              vaultAddress: PREMIUM_VAULT,
              vaultKey: 'premium',
              usd: '100',
            }),
          ],
          baseVaultAddress: BASE_VAULT,
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: 0.05,
          premiumApyDecimal: 0.08,
        }),
      ).toEqual({
        status: 'premium',
        currentVault: 'premium',
        effectiveApyDecimal: 0.08,
        usesBaseApy: false,
      });
    });

    it('returns premium when there are no funds yet', () => {
      expect(
        getMoneyVaultState({
          isEntitled: true,
          positions: [],
          baseVaultAddress: BASE_VAULT,
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: 0.05,
          premiumApyDecimal: 0.08,
        }),
      ).toEqual({
        status: 'premium',
        currentVault: 'premium',
        effectiveApyDecimal: 0.08,
        usesBaseApy: false,
      });
    });

    it('returns upgrading when funds are still in the base vault', () => {
      expect(
        getMoneyVaultState({
          isEntitled: true,
          positions: [
            position({
              vaultAddress: BASE_VAULT,
              vaultKey: 'standard',
              usd: '100',
            }),
          ],
          baseVaultAddress: BASE_VAULT,
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: 0.05,
          premiumApyDecimal: 0.08,
        }),
      ).toEqual({
        status: 'upgrading',
        currentVault: 'base',
        effectiveApyDecimal: 0.05,
        usesBaseApy: true,
      });
    });

    it('returns a weighted APY when funds are split during upgrade', () => {
      expect(
        getMoneyVaultState({
          isEntitled: true,
          positions: [
            position({
              vaultAddress: BASE_VAULT,
              vaultKey: 'standard',
              usd: '50',
            }),
            position({
              vaultAddress: PREMIUM_VAULT,
              vaultKey: 'premium',
              usd: '50',
            }),
          ],
          baseVaultAddress: BASE_VAULT,
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: 0.04,
          premiumApyDecimal: 0.08,
        }),
      ).toEqual({
        status: 'upgrading',
        currentVault: 'base',
        effectiveApyDecimal: 0.06,
        usesBaseApy: true,
      });
    });

    it('leaves the effective APY unset when a split upgrade is missing the base rate', () => {
      expect(
        getMoneyVaultState({
          isEntitled: true,
          positions: [
            position({
              vaultAddress: BASE_VAULT,
              vaultKey: 'standard',
              usd: '50',
            }),
            position({
              vaultAddress: PREMIUM_VAULT,
              vaultKey: 'premium',
              usd: '50',
            }),
          ],
          baseVaultAddress: BASE_VAULT,
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: undefined,
          premiumApyDecimal: 0.08,
        }),
      ).toEqual({
        status: 'upgrading',
        currentVault: 'base',
        effectiveApyDecimal: undefined,
        usesBaseApy: true,
      });
    });
  });

  describe('vault matching', () => {
    it('matches vault addresses case-insensitively', () => {
      expect(
        getMoneyVaultState({
          isEntitled: true,
          positions: [
            position({
              vaultAddress: BASE_VAULT.toLowerCase(),
              vaultKey: 'other',
              usd: '10',
            }),
          ],
          baseVaultAddress: BASE_VAULT.toUpperCase(),
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: 0.05,
          premiumApyDecimal: 0.08,
        }).status,
      ).toBe('upgrading');
    });

    it('falls back to vault_key when addresses are missing', () => {
      expect(
        getMoneyVaultState({
          isEntitled: false,
          positions: [position({ vaultKey: 'premium', usd: '10' })],
          baseVaultAddress: undefined,
          premiumVaultAddress: undefined,
          baseApyDecimal: 0.05,
          premiumApyDecimal: 0.08,
        }),
      ).toEqual({
        status: 'downgrading',
        currentVault: 'premium',
        effectiveApyDecimal: 0.08,
        usesBaseApy: false,
      });
    });

    it('ignores zero and invalid USD balances', () => {
      expect(
        getMoneyVaultState({
          isEntitled: true,
          positions: [
            position({
              vaultAddress: BASE_VAULT,
              vaultKey: 'standard',
              usd: '0',
            }),
            position({
              vaultAddress: BASE_VAULT,
              vaultKey: 'standard',
              usd: 'not-a-number',
            }),
            position({
              vaultAddress: PREMIUM_VAULT,
              vaultKey: 'premium',
              usd: '10',
            }),
          ],
          baseVaultAddress: BASE_VAULT,
          premiumVaultAddress: PREMIUM_VAULT,
          baseApyDecimal: 0.05,
          premiumApyDecimal: 0.08,
        }).status,
      ).toBe('premium');
    });
  });
});
