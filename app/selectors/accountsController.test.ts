import { AccountsControllerState } from '@metamask/accounts-controller';
import { captureException } from '@sentry/react-native';
import { Hex, isValidChecksumAddress } from '@metamask/utils';
import {
  BtcAccountType,
  EthAccountType,
  EthScope,
  BtcMethod,
  EthMethod,
  SolMethod,
  SolAccountType,
} from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import StorageWrapper from '../store/storage-wrapper';
import {
  selectSelectedInternalAccount,
  selectInternalAccounts,
  selectSelectedInternalAccountFormattedAddress,
  selectHasCreatedBtcMainnetAccount,
  hasCreatedBtcTestnetAccount,
  selectCanSignTransactions,
} from './accountsController';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  expectedUuid,
  expectedUuid2,
  internalAccount1,
  MOCK_ADDRESS_2,
  createMockInternalAccount,
  createMockUuidFromAddress,
} from '../util/test/accountsControllerTestUtils';
import { RootState } from '../reducers';
import { AGREED } from '../constants/storage';
import {
  MOCK_KEYRINGS,
  MOCK_KEYRING_CONTROLLER,
} from './keyringController/testUtils';
import { KeyringTypes } from '@metamask/keyring-controller';

/**
 * Generates a mocked AccountsController state
 * The internal accounts are generated in reverse order relative to the mock keyrings that are used for generation
 *
 * @returns - A mocked state of AccountsController
 */
const MOCK_GENERATED_ACCOUNTS_CONTROLLER_REVERSED =
  (): AccountsControllerState => {
    const reversedKeyringAccounts = [...MOCK_KEYRINGS]
      .reverse()
      .flatMap((keyring) => [...keyring.accounts].reverse());
    const accountsForInternalAccounts = reversedKeyringAccounts.reduce(
      (record, keyringAccount, index) => {
        const lowercasedKeyringAccount = keyringAccount.toLowerCase();
        const accountName = `Account ${index}`;
        const uuid = createMockUuidFromAddress(lowercasedKeyringAccount);
        const internalAccount = createMockInternalAccount(
          lowercasedKeyringAccount,
          accountName,
        );
        record[uuid] = internalAccount;
        return record;
      },
      {} as Record<string, InternalAccount>,
    );
    return {
      internalAccounts: {
        accounts: accountsForInternalAccounts,
        selectedAccount: Object.values(accountsForInternalAccounts)[0].id,
      },
    };
  };

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Accounts Controller Selectors', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    StorageWrapper.getItem = jest.fn(() => Promise.resolve(AGREED));
  });
  describe('selectSelectedInternalAccount', () => {
    it('returns selected internal account', () => {
      expect(
        selectSelectedInternalAccount({
          engine: {
            backgroundState: {
              AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
            },
          },
        } as RootState),
      ).toEqual({
        address: '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756',
        id: expectedUuid2,
        options: {},
        scopes: [EthScope.Eoa],
        metadata: {
          name: 'Account 2',
          importTime: 1684232000456,
          keyring: {
            type: 'HD Key Tree',
          },
        },
        methods: [
          'personal_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        type: EthAccountType.Eoa,
      });
    });
    it('throws an error if the selected account ID does not exist', () => {
      const invalidState: AccountsControllerState = {
        internalAccounts: {
          accounts: {
            [expectedUuid]: internalAccount1,
          },
          selectedAccount: 'non-existent-id',
        },
      };
      const errorMessage =
        'selectSelectedInternalAccount: Account with ID non-existent-id not found.';
      const result = selectSelectedInternalAccount({
        engine: {
          backgroundState: {
            AccountsController: invalidState,
          },
        },
      } as RootState);
      expect(result).toBeUndefined();
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  });
  describe('selectInternalAccounts', () => {
    it(`returns internal accounts of the accounts controller sorted by the keyring controller's accounts`, () => {
      const mockAccountsControllerReversed =
        MOCK_GENERATED_ACCOUNTS_CONTROLLER_REVERSED();
      const internalAccountsResult = selectInternalAccounts({
        engine: {
          backgroundState: {
            KeyringController: MOCK_KEYRING_CONTROLLER,
            AccountsController: mockAccountsControllerReversed,
          },
        },
      } as RootState);
      const expectedInteralAccountsResult = Object.values(
        mockAccountsControllerReversed.internalAccounts.accounts,
      ).reverse();

      const internalAccountAddressesResult = internalAccountsResult.map(
        (account) => account.address,
      );
      const expectedAccountAddressesResult = [...MOCK_KEYRINGS].flatMap(
        (keyring) => keyring.accounts,
      );

      // Ensure accounts are correct
      expect(internalAccountsResult).toEqual(expectedInteralAccountsResult);

      // Ensure that order of internal accounts match order of keyring accounts
      expect(internalAccountAddressesResult).toEqual(
        expectedAccountAddressesResult,
      );
    });
  });
  describe('selectSelectedInternalAccountFormattedAddress', () => {
    it('returns selected internal account address in checksum format', () => {
      const result = selectSelectedInternalAccountFormattedAddress({
        engine: {
          backgroundState: {
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          },
        },
      } as RootState);
      const checksummedAddress = MOCK_ADDRESS_2;
      expect(isValidChecksumAddress(result as Hex)).toEqual(true);
      expect(result).toEqual(checksummedAddress);
    });
    it('returns undefined if selected account does not exist', () => {
      const result = selectSelectedInternalAccountFormattedAddress({
        engine: {
          backgroundState: {
            AccountsController: {
              ...MOCK_ACCOUNTS_CONTROLLER_STATE,
              internalAccounts: {
                ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
                selectedAccount: {},
              },
            },
          },
        },
      } as RootState);
      expect(result).toEqual(undefined);
    });
  });
});

const MOCK_BTC_MAINNET_ADDRESS = 'bc1qkv7xptmd7ejmnnd399z9p643updvula5j4g4nd';
const MOCK_BTC_TESTNET_ADDRESS = 'tb1q63st8zfndjh00gf9hmhsdg7l8umuxudrj4lucp';

function getStateWithAccount(account: InternalAccount) {
  return {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            accounts: {
              [account.id]: account,
            },
            selectedAccount: account.id,
          },
        },
        KeyringController: MOCK_KEYRING_CONTROLLER,
      },
    },
  } as RootState;
}

const btcMainnetAccount = createMockInternalAccount(
  MOCK_BTC_MAINNET_ADDRESS,
  'Bitcoin Account',
  KeyringTypes.snap,
  BtcAccountType.P2wpkh,
);

const btcTestnetAccount = createMockInternalAccount(
  MOCK_BTC_TESTNET_ADDRESS,
  'Bitcoin Testnet Account',
  KeyringTypes.snap,
  BtcAccountType.P2wpkh,
);

describe('Bitcoin Account Selectors', () => {
  describe('hasCreatedBtcMainnetAccount', () => {
    it('returns true when a BTC mainnet account exists', () => {
      const state = getStateWithAccount(btcMainnetAccount);
      expect(selectHasCreatedBtcMainnetAccount(state)).toBe(true);
    });

    it('returns false when no BTC mainnet account exists', () => {
      const state = getStateWithAccount(btcTestnetAccount);
      expect(selectHasCreatedBtcMainnetAccount(state)).toBe(false);
    });
  });

  describe('hasCreatedBtcTestnetAccount', () => {
    it('returns true when a BTC testnet account exists', () => {
      const state = getStateWithAccount(btcTestnetAccount);
      expect(hasCreatedBtcTestnetAccount(state)).toBe(true);
    });

    it('returns false when no BTC testnet account exists', () => {
      const state = getStateWithAccount(btcMainnetAccount);
      expect(hasCreatedBtcTestnetAccount(state)).toBe(false);
    });
  });
});

describe('selectCanSignTransactions', () => {
  const ethAccountWithSignTransaction = {
    ...createMockInternalAccount(
      '0x123',
      'ETH Account with Sign',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    ),
    methods: [EthMethod.SignTransaction],
  };

  const solAccountWithSignTransaction = {
    ...createMockInternalAccount(
      '0x456',
      'SOL Account with Sign',
      KeyringTypes.snap,
      SolAccountType.DataAccount,
    ),
    methods: [SolMethod.SignTransaction],
  };

  const solAccountWithSignMessage = {
    ...createMockInternalAccount(
      '0x789',
      'SOL Account with Sign Message',
      KeyringTypes.snap,
      SolAccountType.DataAccount,
    ),
    methods: [SolMethod.SignMessage],
  };

  const solAccountWithSendAndConfirm = {
    ...createMockInternalAccount(
      '0xabc',
      'SOL Account with Send and Confirm',
      KeyringTypes.snap,
      SolAccountType.DataAccount,
    ),
    methods: [SolMethod.SendAndConfirmTransaction],
  };

  const solAccountWithSignAndSend = {
    ...createMockInternalAccount(
      '0xdef',
      'SOL Account with Sign and Send',
      KeyringTypes.snap,
      SolAccountType.DataAccount,
    ),
    methods: [SolMethod.SignAndSendTransaction],
  };

  const btcAccountWithSendBitcoin = {
    ...createMockInternalAccount(
      'bc1q123',
      'BTC Account with Send',
      KeyringTypes.snap,
      BtcAccountType.P2wpkh,
    ),
    methods: [BtcMethod.SendBitcoin],
  };

  const accountWithoutSigningMethods = {
    ...createMockInternalAccount(
      '0x999',
      'Account without Signing',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    ),
    methods: [],
  };

  it('returns true for ETH account with SignTransaction method', () => {
    const state = getStateWithAccount(ethAccountWithSignTransaction);
    expect(selectCanSignTransactions(state)).toBe(true);
  });

  it('returns true for SOL account with SignTransaction method', () => {
    const state = getStateWithAccount(solAccountWithSignTransaction);
    expect(selectCanSignTransactions(state)).toBe(true);
  });

  it('returns true for SOL account with SignMessage method', () => {
    const state = getStateWithAccount(solAccountWithSignMessage);
    expect(selectCanSignTransactions(state)).toBe(true);
  });

  it('returns true for SOL account with SendAndConfirmTransaction method', () => {
    const state = getStateWithAccount(solAccountWithSendAndConfirm);
    expect(selectCanSignTransactions(state)).toBe(true);
  });

  it('returns true for SOL account with SignAndSendTransaction method', () => {
    const state = getStateWithAccount(solAccountWithSignAndSend);
    expect(selectCanSignTransactions(state)).toBe(true);
  });

  it('returns true for BTC account with SendBitcoin method', () => {
    const state = getStateWithAccount(btcAccountWithSendBitcoin);
    expect(selectCanSignTransactions(state)).toBe(true);
  });

  it('returns false for account without any signing methods', () => {
    const state = getStateWithAccount(accountWithoutSigningMethods);
    expect(selectCanSignTransactions(state)).toBe(false);
  });

  it('returns false when no account is selected', () => {
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {},
              selectedAccount: 'non-existent-id',
            },
          },
        },
      },
    } as RootState;
    expect(selectCanSignTransactions(state)).toBe(false);
  });
});
