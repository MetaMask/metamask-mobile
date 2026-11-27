import type { MoneyAccountLifecycle } from '@metamask/money-account-lifecycle-controller';
import type { DerivedIdentity } from '@metamask/chomp-api-service';
import { RootState } from '../../reducers';
import { selectPrimaryMoneyAccount } from '../moneyAccountController';
import {
  selectMfaAddressPendingRestore,
  selectMfaMoneyAccountLifecycle,
  selectMoneyAccountDisplayAddress,
} from './index';

jest.mock('../moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

const mockSelectPrimaryMoneyAccount = jest.mocked(selectPrimaryMoneyAccount);
const SFA_ADDRESS = '0x0000000000000000000000000000000000000001';
const MFA_ADDRESS = '0x0000000000000000000000000000000000000002';
const mockPrimaryAddress = (address?: string) =>
  mockSelectPrimaryMoneyAccount.mockReturnValue(
    (address ? { address } : undefined) as ReturnType<
      typeof selectPrimaryMoneyAccount
    >,
  );

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

  describe('selectMfaAddressPendingRestore', () => {
    const mfaState = () =>
      buildState({ [SFA_ADDRESS]: { type: 'mfa', identity: IDENTITY } });

    it('returns the MFA address when the primary Money account is the SFA account', () => {
      mockPrimaryAddress(SFA_ADDRESS);

      expect(selectMfaAddressPendingRestore(mfaState())).toBe(MFA_ADDRESS);
    });

    it('returns undefined when the MFA account is the primary Money account', () => {
      mockPrimaryAddress(MFA_ADDRESS.toUpperCase().replace('0X', '0x'));

      expect(selectMfaAddressPendingRestore(mfaState())).toBeUndefined();
    });

    it('returns undefined without an mfa lifecycle', () => {
      mockPrimaryAddress(SFA_ADDRESS);

      expect(
        selectMfaAddressPendingRestore(
          buildState({ [SFA_ADDRESS]: { type: 'sfa', identity: IDENTITY } }),
        ),
      ).toBeUndefined();
    });
  });

  describe('selectMoneyAccountDisplayAddress', () => {
    it('returns the MFA address before the MFA account is on this device', () => {
      mockPrimaryAddress(SFA_ADDRESS);

      expect(
        selectMoneyAccountDisplayAddress(
          buildState({ [SFA_ADDRESS]: { type: 'mfa', identity: IDENTITY } }),
        ),
      ).toBe(MFA_ADDRESS);
    });

    it('returns the primary Money account address otherwise', () => {
      mockPrimaryAddress(SFA_ADDRESS);

      expect(selectMoneyAccountDisplayAddress(buildState())).toBe(SFA_ADDRESS);
    });
  });
});
