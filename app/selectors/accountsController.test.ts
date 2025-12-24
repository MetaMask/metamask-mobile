import { AccountsControllerState } from '@metamask/accounts-controller';
import { captureException } from '@sentry/react-native';
import { Hex, isValidChecksumAddress, CaipChainId } from '@metamask/utils';
import {
  BtcAccountType,
  EthAccountType,
  BtcMethod,
  EthMethod,
  SolMethod,
  SolAccountType,
  SolScope,
  BtcScope,
  TrxMethod,
  TrxAccountType,
} from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import StorageWrapper from '../store/storage-wrapper';
import {
  selectSelectedInternalAccount,
  selectInternalAccounts,
  selectSelectedInternalAccountFormattedAddress,
  selectCanSignTransactions,
  selectSolanaAccountAddress,
  selectSolanaAccount,
  selectPreviouslySelectedEvmAccount,
  selectSelectedInternalAccountId,
  selectInternalEvmAccounts,
  selectInternalAccountsByScope,
  selectInternalAccountByAddresses,
} from './accountsController';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  internalAccount1,
  MOCK_ADDRESS_2,
  createMockInternalAccount,
  createMockUuidFromAddress,
  internalAccount2,
  internalSolanaAccount1,
} from '../util/test/accountsControllerTestUtils';
import { RootState } from '../reducers';
import { AGREED } from '../constants/storage';
import {
  MOCK_KEYRINGS,
  MOCK_KEYRING_CONTROLLER,
} from './keyringController/testUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
// eslint-disable-next-line import/no-namespace
import * as utils from '../core/Multichain/utils';

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
      ).toEqual(internalAccount2);
    });
    it('throws an error if the selected account ID does not exist', () => {
      const invalidState: AccountsControllerState = {
        internalAccounts: {
          accounts: {
            [internalAccount1.id]: internalAccount1,
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

describe('Solana Account Selectors', () => {
  beforeEach(() => {
    jest
      .spyOn(utils, 'isSolanaAccount')
      .mockImplementation(
        (account) => account?.address === 'solana_address_123',
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const solanaAccount: InternalAccount = {
    id: 'sol-account-id',
    address: 'solana_address_123',
    type: SolAccountType.DataAccount,
    methods: [SolMethod.SignTransaction],
    options: {},
    metadata: {
      name: 'Solana Account',
      importTime: 1672531200,
      keyring: {
        type: KeyringTypes.snap,
      },
    },
    scopes: [],
  };

  const ethAccount: InternalAccount = {
    id: 'eth-account-id',
    address: '0xabc123',
    type: EthAccountType.Eoa,
    methods: [EthMethod.SignTransaction],
    options: {},
    metadata: {
      name: 'Ethereum Account',
      importTime: 1672531200,
      keyring: {
        type: KeyringTypes.hd,
      },
    },
    scopes: [],
  };

  const noSolanaAccountInState = {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            accounts: {
              [ethAccount.id]: ethAccount,
            },
            selectedAccount: ethAccount.id,
          },
        },
        KeyringController: MOCK_KEYRING_CONTROLLER,
      },
    },
  } as RootState;

  const solanaAccountExistsInState = {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            accounts: {
              [solanaAccount.id]: solanaAccount,
              [ethAccount.id]: ethAccount,
            },
            selectedAccount: ethAccount.id,
          },
        },
        KeyringController: MOCK_KEYRING_CONTROLLER,
      },
    },
  } as RootState;

  describe('selectSolanaAccount', () => {
    it('returns the Solana account when it exists', () => {
      expect(selectSolanaAccount(solanaAccountExistsInState)).toEqual(
        solanaAccount,
      );
    });

    it('returns undefined when no Solana account exists', () => {
      expect(selectSolanaAccount(noSolanaAccountInState)).toBeUndefined();
    });
  });

  describe('selectSolanaAccountAddress', () => {
    it('returns the Solana account address when it exists', () => {
      expect(selectSolanaAccountAddress(solanaAccountExistsInState)).toEqual(
        'solana_address_123',
      );
    });

    it('returns undefined when no Solana account exists', () => {
      expect(
        selectSolanaAccountAddress(noSolanaAccountInState),
      ).toBeUndefined();
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

  const trxAccountWithSignMessage = {
    ...createMockInternalAccount(
      'T123',
      'TRX Account with SignMessage',
      KeyringTypes.snap,
      TrxAccountType.Eoa,
    ),
    methods: [TrxMethod.SignMessage],
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

  const btcAccountWithSignPsbt = {
    ...createMockInternalAccount(
      'bc1q123',
      'BTC Account with SignPsbt',
      KeyringTypes.snap,
      BtcAccountType.P2wpkh,
    ),
    methods: [BtcMethod.SignPsbt],
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

  it('returns true for TRX account with SignMessage method', () => {
    const state = getStateWithAccount(trxAccountWithSignMessage);

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

  it('returns true for BTC account with SignPsbt method', () => {
    const state = getStateWithAccount(btcAccountWithSignPsbt);
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

describe('selectPreviouslySelectedEvmAccount', () => {
  // Helper to create an EVM account with a lastSelected timestamp
  const createEvmAccountWithLastSelected = (
    address: string,
    name: string,
    lastSelectedTimestamp: number,
  ): InternalAccount => {
    const account = createMockInternalAccount(
      address,
      name,
      KeyringTypes.hd,
      EthAccountType.Eoa,
    );

    // Add lastSelected to metadata
    return {
      ...account,
      metadata: {
        ...account.metadata,
        lastSelected: lastSelectedTimestamp,
      },
    };
  };

  it('returns the most recently selected EVM account based on lastSelected timestamp', () => {
    const accountOldest = createEvmAccountWithLastSelected(
      '0x111',
      'Oldest Account',
      1000,
    );

    const accountMiddle = createEvmAccountWithLastSelected(
      '0x222',
      'Middle Account',
      2000,
    );

    const accountNewest = createEvmAccountWithLastSelected(
      '0x333',
      'Newest Account',
      3000,
    );

    // Test state with all accounts
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [accountOldest.id]: accountOldest,
                [accountMiddle.id]: accountMiddle,
                [accountNewest.id]: accountNewest,
              },
              selectedAccount: accountMiddle.id, // Currently selected doesn't affect the result
            },
          },
          KeyringController: MOCK_KEYRING_CONTROLLER,
        },
      },
    } as RootState;
    expect(selectPreviouslySelectedEvmAccount(state)).toEqual(accountNewest);
  });

  it('handles EVM accounts without lastSelected timestamps', () => {
    // Create one account with lastSelected timestamp
    const accountWithTimestamp = createEvmAccountWithLastSelected(
      '0x111',
      'Account With Timestamp',
      1000,
    );

    // Create another account without lastSelected timestamp
    const accountWithoutTimestamp = createMockInternalAccount(
      '0x222',
      'Account Without Timestamp',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    );

    // Test state with both accounts
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [accountWithTimestamp.id]: accountWithTimestamp,
                [accountWithoutTimestamp.id]: accountWithoutTimestamp,
              },
              selectedAccount: accountWithoutTimestamp.id,
            },
          },
          KeyringController: MOCK_KEYRING_CONTROLLER,
        },
      },
    } as RootState;

    // Should return the account with timestamp as it's considered more recently selected
    expect(selectPreviouslySelectedEvmAccount(state)).toEqual(
      accountWithTimestamp,
    );
  });

  it('returns the first account when multiple EVM accounts exist but none have lastSelected timestamps', () => {
    // Create multiple accounts without lastSelected timestamps
    const account1 = createMockInternalAccount(
      '0x111',
      'First Account',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    );

    const account2 = createMockInternalAccount(
      '0x222',
      'Second Account',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    );

    const account3 = createMockInternalAccount(
      '0x333',
      'Third Account',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    );

    // Test state with all accounts
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [account1.id]: account1,
                [account2.id]: account2,
                [account3.id]: account3,
              },
              selectedAccount: account2.id,
            },
          },
          KeyringController: MOCK_KEYRING_CONTROLLER,
        },
      },
    } as RootState;

    // The first account in the sorted list should be returned as they all have the same default timestamp (0)
    const result = selectPreviouslySelectedEvmAccount(state);
    expect(result).toEqual(account1);
  });

  it('only returns EVM accounts when mixed with non-EVM accounts', () => {
    // Create a mix of EVM and non-EVM accounts with timestamps
    const evmAccount = createEvmAccountWithLastSelected(
      '0x111',
      'EVM Account',
      1000,
    );

    // Non-EVM accounts with higher timestamps that should be ignored
    const solAccount = {
      ...createMockInternalAccount(
        'solana_address_456',
        'Solana Account',
        KeyringTypes.snap,
        SolAccountType.DataAccount,
      ),
      metadata: {
        name: 'Solana Account',
        importTime: 1684232000456,
        keyring: { type: KeyringTypes.snap },
        lastSelected: 2000, // Higher timestamp that should be ignored
      },
    };

    const btcAccount = {
      ...createMockInternalAccount(
        'bc1q123xyz',
        'Bitcoin Account',
        KeyringTypes.snap,
        BtcAccountType.P2wpkh,
      ),
      metadata: {
        name: 'Bitcoin Account',
        importTime: 1684232000456,
        keyring: { type: KeyringTypes.snap },
        lastSelected: 3000, // Highest timestamp that should be ignored
      },
    };

    // Test state with mixed accounts
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [evmAccount.id]: evmAccount,
                [solAccount.id]: solAccount,
                [btcAccount.id]: btcAccount,
              },
              selectedAccount: solAccount.id, // Non-EVM account is currently selected
            },
          },
          KeyringController: MOCK_KEYRING_CONTROLLER,
        },
      },
    } as RootState;

    // Should return the EVM account even though non-EVM accounts have higher lastSelected timestamps
    expect(selectPreviouslySelectedEvmAccount(state)).toEqual(evmAccount);
  });

  it('returns undefined when no EVM accounts exist', () => {
    // Create only non-EVM accounts (Solana and Bitcoin)
    const solAccount = createMockInternalAccount(
      'solana_address_456',
      'Solana Account',
      KeyringTypes.snap,
      SolAccountType.DataAccount,
    );

    const btcAccount = createMockInternalAccount(
      'bc1q123xyz',
      'Bitcoin Account',
      KeyringTypes.snap,
      BtcAccountType.P2wpkh,
    );

    // Test state with no EVM accounts
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [solAccount.id]: solAccount,
                [btcAccount.id]: btcAccount,
              },
              selectedAccount: solAccount.id,
            },
          },
          KeyringController: MOCK_KEYRING_CONTROLLER,
        },
      },
    } as RootState;

    // Should return undefined as there are no EVM accounts
    expect(selectPreviouslySelectedEvmAccount(state)).toBeUndefined();
  });
});

describe('selectSelectedInternalAccountId', () => {
  const arrangeAccount = () =>
    createMockInternalAccount(
      '0xAddr1',
      'Mock Account',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    );

  it('returns the selected accountId from state', () => {
    const internalAccount = arrangeAccount();
    const state = getStateWithAccount(internalAccount);
    const result = selectSelectedInternalAccountId(state);
    expect(result).toBe(internalAccount.id);
  });

  it('returns the same result on subsequent calls, does not recompute', () => {
    const internalAccount = arrangeAccount();
    const state = getStateWithAccount(internalAccount);
    const result1 = selectSelectedInternalAccountId(state);
    const result2 = selectSelectedInternalAccountId(state);
    expect(result1).toBe(result2);
    expect(selectSelectedInternalAccountId.recomputations()).toBe(1);
  });
});

describe('selectInternalEvmAccounts', () => {
  it(`returns internal accounts with evm account type`, () => {
    const mockAccountsControllerReversed =
      MOCK_GENERATED_ACCOUNTS_CONTROLLER_REVERSED();

    const stateAccountsList = Object.values(
      mockAccountsControllerReversed.internalAccounts.accounts,
    );

    expect(stateAccountsList).toHaveLength(6);

    stateAccountsList[0].type = 'solana:data-account';
    stateAccountsList[1].type = 'bip122:p2pkh';

    const result = selectInternalEvmAccounts({
      engine: {
        backgroundState: {
          KeyringController: MOCK_KEYRING_CONTROLLER,
          AccountsController: mockAccountsControllerReversed,
        },
      },
    } as RootState);

    expect(result).toHaveLength(4);
  });
});

describe('selectInternalAccountsByScope', () => {
  it('returns all EVM accounts when wildcard eip155:0 is requested', () => {
    const scaSepolia: InternalAccount = createMockInternalAccount(
      '0xSCA4337',
      'SCA Sepolia',
      KeyringTypes.hd,
      EthAccountType.Erc4337,
    );
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                // EOA with eip155:0 by default
                [internalAccount1.id]: internalAccount1,
                // SCA mapped to an EVM testnet scope by test utils
                [scaSepolia.id]: scaSepolia,
                // Non-EVM should be excluded
                [internalSolanaAccount1.id]: internalSolanaAccount1,
              },
              selectedAccount: internalAccount1.id,
            },
          },
        },
      },
    } as unknown as RootState;

    const result = selectInternalAccountsByScope(state, 'eip155:0');
    expect(result).toEqual(
      expect.arrayContaining([internalAccount1, scaSepolia]),
    );
    expect(
      result.find((a) => a.id === internalSolanaAccount1.id),
    ).toBeUndefined();
    expect(result).toHaveLength(2);
  });

  it('includes SCA with eip155:0 when requesting specific EVM scope (eip155:1)', () => {
    const eoaAccount: InternalAccount = {
      ...internalAccount1,
      id: `${internalAccount1.id}-eoa`,
    };
    const scaMainnet: InternalAccount = {
      ...createMockInternalAccount(
        '0xSCA4337',
        'SCA Mainnet',
        KeyringTypes.hd,
        EthAccountType.Erc4337,
      ),
      scopes: ['eip155:0' as CaipChainId],
    };
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [eoaAccount.id]: eoaAccount,
                [scaMainnet.id]: scaMainnet,
              },
              selectedAccount: eoaAccount.id,
            },
          },
        },
      },
    } as unknown as RootState;

    const result = selectInternalAccountsByScope(state, 'eip155:1');
    expect(result).toEqual(expect.arrayContaining([eoaAccount, scaMainnet]));
    expect(result).toHaveLength(2);
  });

  it('excludes SCA with different specific chain when requesting eip155:1 (no wildcard)', () => {
    const eoaAccount: InternalAccount = {
      ...internalAccount1,
      id: `${internalAccount1.id}-eoa`,
    };
    const scaSepolia: InternalAccount = createMockInternalAccount(
      '0xSCA4337',
      'SCA Sepolia',
      KeyringTypes.hd,
      EthAccountType.Erc4337,
    );
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [eoaAccount.id]: eoaAccount,
                [scaSepolia.id]: scaSepolia,
              },
              selectedAccount: eoaAccount.id,
            },
          },
        },
      },
    } as unknown as RootState;

    const result = selectInternalAccountsByScope(state, 'eip155:1');
    expect(result).toEqual([eoaAccount]);
  });

  it('returns only accounts with the exact non-EVM scope', () => {
    const solanaAccount: InternalAccount = {
      ...internalAccount1,
      id: `${internalAccount1.id}-sol`,
      scopes: [SolScope.Mainnet],
    };
    const anotherSolanaAccount: InternalAccount = {
      ...internalAccount2,
      id: `${internalAccount2.id}-sol2`,
      scopes: [SolScope.Mainnet],
    };
    const btcAccount: InternalAccount = {
      ...internalAccount2,
      id: `${internalAccount2.id}-btc`,
      scopes: [BtcScope.Mainnet],
    };

    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [solanaAccount.id]: solanaAccount,
                [anotherSolanaAccount.id]: anotherSolanaAccount,
                [btcAccount.id]: btcAccount,
              },
              selectedAccount: solanaAccount.id,
            },
          },
        },
      },
    } as unknown as RootState;

    const result = selectInternalAccountsByScope(state, SolScope.Mainnet);
    expect(result).toEqual(
      expect.arrayContaining([solanaAccount, anotherSolanaAccount]),
    );
    expect(result).toHaveLength(2);
  });

  it('returns an empty array when no accounts match the requested scope', () => {
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {},
              selectedAccount: undefined,
            },
          },
        },
      },
    } as unknown as RootState;

    const result = selectInternalAccountsByScope(state, BtcScope.Mainnet);
    expect(result).toEqual([]);
  });
});

describe('selectInternalAccountByAddresses', () => {
  const account1 = createMockInternalAccount(
    '0xAddress1',
    'Account 1',
    KeyringTypes.hd,
    EthAccountType.Eoa,
  );

  const account2 = createMockInternalAccount(
    '0xAddress2',
    'Account 2',
    KeyringTypes.hd,
    EthAccountType.Eoa,
  );

  const account3 = createMockInternalAccount(
    '0xAddress3',
    'Account 3',
    KeyringTypes.hd,
    EthAccountType.Eoa,
  );

  const account4 = createMockInternalAccount(
    '0xAddress4',
    'Account 4',
    KeyringTypes.hd,
    EthAccountType.Eoa,
  );

  it('returns accounts matching the provided addresses', () => {
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [account1.id]: account1,
                [account2.id]: account2,
                [account3.id]: account3,
                [account4.id]: account4,
              },
              selectedAccount: account1.id,
            },
          },
        },
      },
    } as RootState;

    const getInternalAccountsByAddresses =
      selectInternalAccountByAddresses(state);
    const result = getInternalAccountsByAddresses(['0xAddress1', '0xAddress3']);
    expect(result).toEqual([account1, account3]);
  });

  it('returns an empty array if no accounts match the provided addresses', () => {
    const state = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [account1.id]: account1,
                [account2.id]: account2,
              },
              selectedAccount: account1.id,
            },
          },
        },
      },
    } as RootState;

    const getInternalAccountsByAddresses =
      selectInternalAccountByAddresses(state);
    const result = getInternalAccountsByAddresses(['0xAddress3']);
    expect(result).toEqual([]);
  });
});
