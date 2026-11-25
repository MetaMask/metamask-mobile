import type { MoneyAccountLifecycle } from '@metamask/money-account-lifecycle-controller';
import type { DerivedIdentity } from '@metamask/chomp-api-service';
import { RootState } from '../../reducers';
import { selectMfaMoneyAccountLifecycle } from './index';

const IDENTITY: DerivedIdentity = {
  currentAddress: '0x0000000000000000000000000000000000000002',
  previousAddresses: ['0x0000000000000000000000000000000000000001'],
  status: 'DONE',
  migration: null,
};

const buildState = (
  moneyAccounts?: Record<string, MoneyAccountLifecycle>,
): RootState =>
  ({
    engine: {
      backgroundState: {
        MoneyAccountLifecycleController: moneyAccounts
          ? { moneyAccounts }
          : undefined,
      },
    },
  }) as unknown as RootState;

describe('MoneyAccountLifecycleController selectors', () => {
  describe('selectMfaMoneyAccountLifecycle', () => {
    it('returns the first mfa lifecycle', () => {
      const mfaLifecycle: MoneyAccountLifecycle = {
        type: 'mfa',
        identity: IDENTITY,
      };
      const state = buildState({
        '0xaaa': { type: 'notInIdentity' },
        '0xbbb': { type: 'sfa', identity: IDENTITY },
        '0xccc': mfaLifecycle,
      });

      expect(selectMfaMoneyAccountLifecycle(state)).toBe(mfaLifecycle);
    });

    it('returns undefined when no lifecycle is mfa', () => {
      const state = buildState({
        '0xaaa': { type: 'migrating', identity: IDENTITY },
      });

      expect(selectMfaMoneyAccountLifecycle(state)).toBeUndefined();
    });

    it('returns undefined when the controller state is missing', () => {
      expect(selectMfaMoneyAccountLifecycle(buildState())).toBeUndefined();
    });
  });
});
