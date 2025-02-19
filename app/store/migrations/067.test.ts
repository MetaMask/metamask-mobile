import {
  BtcScope,
  EthScope,
  SolScope,
  EthMethod,
  CaipChainId,
} from '@metamask/keyring-api';
import { AccountsControllerState } from '@metamask/accounts-controller';
import { captureException } from '@sentry/react-native';
import migration from './067';

jest.mock('../../util/Logger');
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);

interface StateType {
  engine: {
    backgroundState: {
      AccountsController: AccountsControllerState;
    };
  };
}

// Migration 67 is a re-run of migration 66 with updated scope values. The tests are the same as 66 with a few extra checks
describe('migration #67', () => {
  const MOCK_INVALID_STATE = {
    someKey: 'someValue',
  };

  const MOCK_EMPTY_STATE: StateType = {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            accounts: {},
            selectedAccount: '',
          },
        },
      },
    },
  };

  const MOCK_STATE_WITH_ACCOUNTS: StateType = {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'evm-1',
            accounts: {
              'evm-1': {
                id: 'evm-1',
                type: 'eip155:eoa',
                address: '0x123',
                options: {},
                metadata: {
                  name: 'Account 1',
                  keyring: { type: 'HD Key Tree' },
                  importTime: Date.now(),
                },
                methods: [
                  EthMethod.PersonalSign,
                  EthMethod.SignTransaction,
                  EthMethod.SignTypedDataV4,
                ],
                scopes: [],
              },
              'evm-2': {
                id: 'evm-2',
                type: 'eip155:erc4337',
                address: '0x456',
                options: {},
                metadata: {
                  name: 'Account 2',
                  keyring: { type: 'HD Key Tree' },
                  importTime: Date.now(),
                },
                methods: [
                  EthMethod.PersonalSign,
                  EthMethod.SignTransaction,
                  EthMethod.SignTypedDataV4,
                ],
                scopes: [],
              },
              'btc-mainnet': {
                id: 'btc-mainnet',
                type: 'bip122:p2wpkh',
                address: 'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k',
                options: {},
                metadata: {
                  name: 'BTC Mainnet Account',
                  keyring: { type: 'HD Key Tree' },
                  importTime: Date.now(),
                },
                methods: [],
                scopes: [],
              },
              'btc-testnet': {
                id: 'btc-testnet',
                type: 'bip122:p2wpkh',
                address: 'tb1q6rmsq3vlfdhjdhtkxlqtuhhlr6pmj09y6w43g8',
                options: {},
                metadata: {
                  name: 'BTC Testnet Account',
                  keyring: { type: 'HD Key Tree' },
                  importTime: Date.now(),
                },
                methods: [],
                scopes: [],
              },
              'sol-1': {
                id: 'sol-1',
                type: 'solana:data-account',
                address: 'solana123',
                options: {},
                metadata: {
                  name: 'Solana Account',
                  keyring: { type: 'HD Key Tree' },
                  importTime: Date.now(),
                },
                methods: [],
                scopes: [],
              },
            },
          },
        },
      },
    },
  };

  const MOCK_STATE_WITH_EXISTING_SCOPES: StateType = {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'evm-1',
            accounts: {
              'evm-1': {
                id: 'evm-1',
                type: 'eip155:eoa',
                address: '0x123',
                options: {},
                metadata: {
                  name: 'Account 1',
                  keyring: { type: 'HD Key Tree' },
                  importTime: Date.now(),
                },
                methods: [
                  EthMethod.PersonalSign,
                  EthMethod.SignTransaction,
                  EthMethod.SignTypedDataV4,
                ],
                scopes: [EthScope.Eoa],
              },
            },
          },
        },
      },
    },
  };

  it('captures exception for invalid state structure', () => {
    const invalidState = {
      engine: {
        backgroundState: {
          AccountsController: 'not an object', // Invalid type
        },
      },
    };

    const result = migration(invalidState);

    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Invalid state structure for AccountsController',
        ),
      }),
    );
    expect(result).toBe(invalidState);
  });

  it('handles completely missing AccountsController', () => {
    const stateWithoutAccounts = {
      engine: {
        backgroundState: {},
      },
    };

    const result = migration(stateWithoutAccounts);

    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Invalid state structure for AccountsController',
        ),
      }),
    );
    expect(result).toBe(stateWithoutAccounts);
  });

  it('handles unexpected errors', () => {
    const malformedState = null;

    const result = migration(malformedState);

    expect(captureException).toHaveBeenCalled();
    expect(result).toBe(malformedState);
  });
  it('returns state if not valid', () => {
    const result = migration(MOCK_INVALID_STATE);
    expect(result).toEqual(MOCK_INVALID_STATE);
  });

  it('returns state if empty accounts', () => {
    const result = migration(MOCK_EMPTY_STATE);
    expect(result).toEqual(MOCK_EMPTY_STATE);
  });

  it('preserves accounts that have valid scopes', () => {
    const stateCopy = JSON.parse(
      JSON.stringify(MOCK_STATE_WITH_EXISTING_SCOPES),
    );
    const result = migration(stateCopy) as StateType;
    expect(result).toEqual(MOCK_STATE_WITH_EXISTING_SCOPES);
  });

  it('adds correct scopes for all account types', () => {
    const stateCopy = JSON.parse(JSON.stringify(MOCK_STATE_WITH_ACCOUNTS));
    const result = migration(stateCopy) as StateType;
    const accounts =
      result.engine.backgroundState.AccountsController.internalAccounts
        .accounts;

    // Check EVM EOA account
    expect(accounts['evm-1']?.scopes).toEqual([EthScope.Eoa]);

    // Check EVM ERC4337 account
    expect(accounts['evm-2']?.scopes).toEqual([EthScope.Testnet]);

    // Check BTC account
    expect(accounts['btc-mainnet']?.scopes).toEqual([BtcScope.Mainnet]);
    expect(accounts['btc-testnet']?.scopes).toEqual([BtcScope.Testnet]);

    // Check Solana account
    expect(accounts['sol-1']?.scopes).toEqual([
      SolScope.Mainnet,
      SolScope.Testnet,
      SolScope.Devnet,
    ]);
  });

  it('handles malformed account objects gracefully', () => {
    const malformedState: StateType = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'valid-1',
              accounts: {
                'valid-1': {
                  id: 'valid-1',
                  type: 'eip155:eoa',
                  address: '0x123',
                  options: {},
                  metadata: {
                    name: 'Account 1',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [
                    EthMethod.PersonalSign,
                    EthMethod.SignTransaction,
                    EthMethod.SignTypedDataV4,
                  ],
                  scopes: [],
                },
              },
            },
          },
        },
      },
    };

    const result = migration(malformedState) as StateType;
    const accounts =
      result.engine.backgroundState.AccountsController.internalAccounts
        .accounts;

    // Should still process valid accounts
    expect(accounts['valid-1']?.scopes).toEqual([EthScope.Eoa]);
  });

  it('handles invalid scopes property gracefully', () => {
    const stateWithInvalidScopes: StateType = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'invalid-1',
              accounts: {
                'invalid-1': {
                  id: 'invalid-1',
                  type: 'eip155:eoa',
                  address: '0x123',
                  options: {},
                  metadata: {
                    name: 'Account 1',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [
                    EthMethod.PersonalSign,
                    EthMethod.SignTransaction,
                    EthMethod.SignTypedDataV4,
                  ],
                  // @ts-expect-error Testing invalid scope type
                  scopes: null,
                },
                'invalid-2': {
                  id: 'invalid-2',
                  type: 'eip155:eoa',
                  address: '0x456',
                  options: {},
                  metadata: {
                    name: 'Account 2',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [
                    EthMethod.PersonalSign,
                    EthMethod.SignTransaction,
                    EthMethod.SignTypedDataV4,
                  ],
                  scopes: [],
                },
                'invalid-3': {
                  id: 'invalid-3',
                  type: 'eip155:eoa',
                  address: '0x789',
                  options: {},
                  metadata: {
                    name: 'Account 3',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [
                    EthMethod.PersonalSign,
                    EthMethod.SignTransaction,
                    EthMethod.SignTypedDataV4,
                  ],
                  // @ts-expect-error Testing invalid scope type
                  scopes: undefined,
                },
              },
            },
          },
        },
      },
    };

    const result = migration(stateWithInvalidScopes) as StateType;
    const accounts =
      result.engine.backgroundState.AccountsController.internalAccounts
        .accounts;

    // Should fix accounts with invalid scopes
    expect(accounts['invalid-1']?.scopes).toEqual([EthScope.Eoa]);
    expect(accounts['invalid-2']?.scopes).toEqual([EthScope.Eoa]);
    expect(accounts['invalid-3']?.scopes).toEqual([EthScope.Eoa]);
  });

  it('logs unknown account types to Sentry', () => {
    const stateWithUnknownType: StateType = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'unknown-1',
              accounts: {
                'unknown-1': {
                  id: 'unknown-1',
                  // @ts-expect-error Testing unknown account type
                  type: 'unknown-type',
                  address: '0x123',
                  options: {},
                  metadata: {
                    name: 'Unknown Account',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [],
                  scopes: [],
                },
              },
            },
          },
        },
      },
    };

    const result = migration(stateWithUnknownType) as StateType;
    const accounts =
      result.engine.backgroundState.AccountsController.internalAccounts
        .accounts;

    // Verify scopes are set to default EVM namespace
    expect(accounts['unknown-1']?.scopes).toEqual([EthScope.Eoa]);

    // Verify Sentry exception was captured
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        'Migration 67: Unknown account type unknown-type, defaulting to EVM EOA',
      ),
    );
  });

  it('updates accounts that were previously migrated with old scope values', () => {
    // Old scope values for testing migration from previous state
    const OLD_ETH_NAMESPACE_SCOPE = 'eip155' as CaipChainId;
    const OLD_SOL_NAMESPACE_SCOPE = 'solana' as CaipChainId;
    const OLD_BTC_NAMESPACE_SCOPE = 'bip122' as CaipChainId;

    const stateWithOldScopes: StateType = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'evm-1',
              accounts: {
                'evm-1': {
                  id: 'evm-1',
                  type: 'eip155:eoa',
                  address: '0x123',
                  options: {},
                  metadata: {
                    name: 'Account 1',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [
                    EthMethod.PersonalSign,
                    EthMethod.SignTransaction,
                    EthMethod.SignTypedDataV4,
                  ],
                  // This represents the old scope value from migration 66
                  scopes: [OLD_ETH_NAMESPACE_SCOPE],
                },
                'evm-2': {
                  id: 'evm-2',
                  type: 'eip155:erc4337',
                  address: '0x456',
                  options: {},
                  metadata: {
                    name: 'Account 2',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [
                    EthMethod.PersonalSign,
                    EthMethod.SignTransaction,
                    EthMethod.SignTypedDataV4,
                  ],
                  // This represents the old scope value from migration 66
                  scopes: [OLD_ETH_NAMESPACE_SCOPE],
                },
                'sol-1': {
                  id: 'sol-1',
                  type: 'solana:data-account',
                  address: 'solana123',
                  options: {},
                  metadata: {
                    name: 'Solana Account',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [],
                  // Old Solana namespace scope
                  scopes: [OLD_SOL_NAMESPACE_SCOPE],
                },
                'btc-mainnet': {
                  id: 'btc-mainnet',
                  type: 'bip122:p2wpkh',
                  address: 'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k',
                  options: {},
                  metadata: {
                    name: 'BTC Account',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [],
                  // Old BTC namespace scope
                  scopes: [OLD_BTC_NAMESPACE_SCOPE],
                },
                'btc-testnet': {
                  id: 'btc-testnet',
                  type: 'bip122:p2wpkh',
                  address: 'tb1q6rmsq3vlfdhjdhtkxlqtuhhlr6pmj09y6w43g8',
                  options: {},
                  metadata: {
                    name: 'BTC Account',
                    keyring: { type: 'HD Key Tree' },
                    importTime: Date.now(),
                  },
                  methods: [],
                  // Old BTC namespace scope
                  scopes: [OLD_BTC_NAMESPACE_SCOPE],
                },
              },
            },
          },
        },
      },
    };

    const stateCopy = JSON.parse(JSON.stringify(stateWithOldScopes));
    const result = migration(stateCopy) as StateType;
    const accounts =
      result.engine.backgroundState.AccountsController.internalAccounts
        .accounts;

    // Check that old scope values were updated to new ones
    expect(accounts['evm-1']?.scopes).toEqual([EthScope.Eoa]);
    expect(accounts['evm-2']?.scopes).toEqual([EthScope.Testnet]);
    expect(accounts['sol-1']?.scopes).toEqual([
      SolScope.Mainnet,
      SolScope.Testnet,
      SolScope.Devnet,
    ]);
    expect(accounts['btc-mainnet']?.scopes).toEqual([BtcScope.Mainnet]);
    expect(accounts['btc-testnet']?.scopes).toEqual([BtcScope.Testnet]);
  });
});
