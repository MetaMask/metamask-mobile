import {
  selectMoneyAccountBalanceAddress,
  selectMoneyAccounts,
  selectPrimaryMoneyAccount,
} from './index';
import type { MoneyAccount } from '@metamask/money-account-controller';
import type { DerivedIdentity } from '@metamask/chomp-api-service';
import type {
  MoneyAccountLifecycle,
  MoneyAccountLifecycleControllerState,
} from '@metamask/money-account-lifecycle-controller';
import type { Hex } from '@metamask/utils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { MONEY_DERIVATION_PATH } from '@metamask/eth-money-keyring';
import { MOCK_HD_KEYRING_METADATA } from '../keyringController/testUtils';
import { isMpcMoneyKeyringBuildEnabled } from '../../constants/featureFlags';

jest.mock('../../constants/featureFlags', () => ({
  isMpcMoneyKeyringBuildEnabled: jest.fn(() => false),
}));

const SFA_ADDRESS = '0xabc123';
const MFA_ADDRESS = '0x0fa0000000000000000000000000000000000002';

const MOCK_MONEY_ACCOUNT: MoneyAccount = {
  id: 'account-1',
  address: SFA_ADDRESS,
  type: 'eip155:eoa',
  scopes: [],
  methods: [],
  options: {
    entropy: {
      type: 'mnemonic',
      id: MOCK_HD_KEYRING_METADATA.id,
      derivationPath: `${MONEY_DERIVATION_PATH}/0`,
      groupIndex: 0,
    },
    exportable: false,
  },
};

const MOCK_MPC_MONEY_ACCOUNT: MoneyAccount = {
  ...MOCK_MONEY_ACCOUNT,
  id: 'mpc-account',
  address: MFA_ADDRESS,
  options: { entropy: { type: 'mpc' }, exportable: false },
};

const MOCK_MONEY_ACCOUNTS = {
  [MOCK_MONEY_ACCOUNT.id]: MOCK_MONEY_ACCOUNT,
};

const MOCK_MONEY_ACCOUNTS_WITH_MPC = {
  ...MOCK_MONEY_ACCOUNTS,
  [MOCK_MPC_MONEY_ACCOUNT.id]: MOCK_MPC_MONEY_ACCOUNT,
};

const identity = (
  currentAddress: Hex,
  previousAddresses: Hex[] = [],
): DerivedIdentity => ({
  currentAddress,
  previousAddresses,
  status: 'DONE',
  migration: null,
});

const lifecycleState = (
  lifecycle: MoneyAccountLifecycle,
): MoneyAccountLifecycleControllerState => ({
  moneyAccounts: { [MOCK_MONEY_ACCOUNT.address.toLowerCase()]: lifecycle },
  addressRegistrations: {},
});

describe('MoneyAccountController selectors', () => {
  describe('selectMoneyAccounts', () => {
    it('returns the moneyAccounts record', () => {
      const result = selectMoneyAccounts.resultFunc({
        moneyAccounts: MOCK_MONEY_ACCOUNTS,
        defaultMoneyAccountId: MOCK_MONEY_ACCOUNT.id,
      });

      expect(result).toEqual(MOCK_MONEY_ACCOUNTS);
    });
  });

  describe('selectPrimaryMoneyAccount', () => {
    it('returns the money account matching the primary HD keyring', () => {
      const result = selectPrimaryMoneyAccount.resultFunc(
        MOCK_MONEY_ACCOUNTS,
        {
          type: KeyringTypes.hd,
          accounts: [],
          metadata: MOCK_HD_KEYRING_METADATA,
        },
        null,
      );

      expect(result).toEqual(MOCK_MONEY_ACCOUNT);
    });

    it('returns undefined when no account matches the primary HD keyring', () => {
      const result = selectPrimaryMoneyAccount.resultFunc(
        MOCK_MONEY_ACCOUNTS,
        {
          type: KeyringTypes.hd,
          accounts: [],
          metadata: { id: 'different-keyring-id', name: '' },
        },
        null,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when moneyAccounts is empty', () => {
      const result = selectPrimaryMoneyAccount.resultFunc(
        {},
        {
          type: KeyringTypes.hd,
          accounts: [],
          metadata: MOCK_HD_KEYRING_METADATA,
        },
        null,
      );

      expect(result).toBeUndefined();
    });

    describe('after the Money account moved to MPC', () => {
      const keyring = {
        type: KeyringTypes.hd,
        accounts: [],
        metadata: MOCK_HD_KEYRING_METADATA,
      };

      it('returns the default MPC Money account in builds with the MPC keyring', () => {
        jest.mocked(isMpcMoneyKeyringBuildEnabled).mockReturnValueOnce(true);

        expect(
          selectPrimaryMoneyAccount.resultFunc(
            MOCK_MONEY_ACCOUNTS_WITH_MPC,
            keyring,
            MOCK_MPC_MONEY_ACCOUNT.id,
          ),
        ).toEqual(MOCK_MPC_MONEY_ACCOUNT);
      });

      it('keeps the SRP Money account in builds without the MPC keyring', () => {
        expect(
          selectPrimaryMoneyAccount.resultFunc(
            MOCK_MONEY_ACCOUNTS_WITH_MPC,
            keyring,
            MOCK_MPC_MONEY_ACCOUNT.id,
          ),
        ).toEqual(MOCK_MONEY_ACCOUNT);
      });
    });

    it('returns undefined when there is no primary HD keyring', () => {
      const result = selectPrimaryMoneyAccount.resultFunc(
        MOCK_MONEY_ACCOUNTS,
        undefined,
        null,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('selectMoneyAccountBalanceAddress', () => {
    it('returns the SFA address while the account has no identity', () => {
      const result = selectMoneyAccountBalanceAddress.resultFunc(
        MOCK_MONEY_ACCOUNT,
        lifecycleState({ type: 'notInIdentity' }),
        MOCK_MONEY_ACCOUNT,
      );

      expect(result).toBe(MOCK_MONEY_ACCOUNT.address);
    });

    it('returns the current address while the account is migrating', () => {
      const result = selectMoneyAccountBalanceAddress.resultFunc(
        MOCK_MONEY_ACCOUNT,
        lifecycleState({
          type: 'migrating',
          identity: identity(SFA_ADDRESS),
        }),
        MOCK_MONEY_ACCOUNT,
      );

      expect(result).toBe(MOCK_MONEY_ACCOUNT.address);
    });

    it('returns the MFA address once the account is MFA and the MPC account is primary', () => {
      const result = selectMoneyAccountBalanceAddress.resultFunc(
        MOCK_MONEY_ACCOUNT,
        lifecycleState({
          type: 'mfa',
          identity: identity(MFA_ADDRESS, [SFA_ADDRESS]),
        }),
        MOCK_MPC_MONEY_ACCOUNT,
      );

      expect(result).toBe(MFA_ADDRESS);
    });

    it('returns the MFA address when the account is MFA and there is no local MPC account', () => {
      const result = selectMoneyAccountBalanceAddress.resultFunc(
        MOCK_MONEY_ACCOUNT,
        lifecycleState({
          type: 'mfa',
          identity: identity(MFA_ADDRESS, [SFA_ADDRESS]),
        }),
        MOCK_MONEY_ACCOUNT,
      );

      expect(result).toBe(MFA_ADDRESS);
    });

    it('returns the MFA address when the account is MFA and there is no primary account', () => {
      const result = selectMoneyAccountBalanceAddress.resultFunc(
        MOCK_MONEY_ACCOUNT,
        lifecycleState({ type: 'mfa', identity: identity(MFA_ADDRESS) }),
        undefined,
      );

      expect(result).toBe(MFA_ADDRESS);
    });

    it('returns the primary address when there is no lifecycle entry', () => {
      const result = selectMoneyAccountBalanceAddress.resultFunc(
        MOCK_MONEY_ACCOUNT,
        { moneyAccounts: {}, addressRegistrations: {} },
        MOCK_MPC_MONEY_ACCOUNT,
      );

      expect(result).toBe(MOCK_MPC_MONEY_ACCOUNT.address);
    });

    it('returns the primary address when there is no SFA account', () => {
      const result = selectMoneyAccountBalanceAddress.resultFunc(
        undefined,
        lifecycleState({ type: 'mfa', identity: identity(MFA_ADDRESS) }),
        MOCK_MPC_MONEY_ACCOUNT,
      );

      expect(result).toBe(MOCK_MPC_MONEY_ACCOUNT.address);
    });

    it('returns undefined when there is no SFA lifecycle and no primary account', () => {
      const result = selectMoneyAccountBalanceAddress.resultFunc(
        undefined,
        { moneyAccounts: {}, addressRegistrations: {} },
        undefined,
      );

      expect(result).toBeUndefined();
    });

    it('preserves the primary account casing when it matches the identity address', () => {
      const checksummedAddress = '0x0Fa0000000000000000000000000000000000002';

      const result = selectMoneyAccountBalanceAddress.resultFunc(
        MOCK_MONEY_ACCOUNT,
        lifecycleState({ type: 'mfa', identity: identity(MFA_ADDRESS) }),
        { ...MOCK_MPC_MONEY_ACCOUNT, address: checksummedAddress },
      );

      expect(result).toBe(checksummedAddress);
    });
  });
});
