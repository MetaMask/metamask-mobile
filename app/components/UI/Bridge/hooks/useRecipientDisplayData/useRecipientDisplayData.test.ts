import '../../_mocks_/initialState';
import { createBridgeTestState } from '../../testUtils';
import { useRecipientDisplayData } from './useRecipientDisplayData';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { Hex } from '@metamask/utils';
import { EthAccountType, EthScope } from '@metamask/keyring-api';
import { AccountWalletType, AccountGroupType } from '@metamask/account-api';

describe('useRecipientDisplayData', () => {
  const testAccountId = 'testAccountId';
  const testAccountAddress =
    '0xabcdef1234567890abcdef1234567890abcdef12' as Hex;
  const testAccountId2 = 'testAccountId2';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when destAddress is not set', () => {
    it('returns undefined for all fields', () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          destAddress: undefined,
        },
      });

      const { result } = renderHookWithProvider(
        () => useRecipientDisplayData(),
        {
          state: testState,
        },
      );

      expect(result.current).toEqual({
        destinationDisplayName: undefined,
        destinationWalletName: undefined,
        destinationAccountAddress: undefined,
      });
    });
  });

  describe('when destAddress is set but not an internal account', () => {
    it('returns external address without display name or wallet name', () => {
      const externalAddress =
        '0x1111111111111111111111111111111111111111' as Hex;

      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          destAddress: externalAddress,
        },
      });

      const { result } = renderHookWithProvider(
        () => useRecipientDisplayData(),
        {
          state: testState,
        },
      );

      expect(result.current).toEqual({
        destinationDisplayName: undefined,
        destinationWalletName: undefined,
        destinationAccountAddress: externalAddress,
      });
    });
  });

  describe('when destAddress matches an internal account', () => {
    describe('with multichain accounts state 2 disabled', () => {
      it('returns account metadata name without wallet name', () => {
        const testState = createBridgeTestState();

        testState.engine = {
          ...testState.engine,
          backgroundState: {
            ...testState.engine?.backgroundState,
            RemoteFeatureFlagController: {
              ...testState.engine?.backgroundState?.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...testState.engine?.backgroundState
                  ?.RemoteFeatureFlagController?.remoteFeatureFlags,
                multichainAccountsState2: false,
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: testAccountId,
                accounts: {
                  [testAccountId]: {
                    id: testAccountId,
                    address: testAccountAddress,
                    metadata: {
                      name: 'My Test Account',
                      lastSelected: 0,
                    },
                    type: EthAccountType.Eoa,
                    scopes: [EthScope.Eoa],
                  },
                },
              },
            },
          },
        };

        testState.bridge = {
          ...testState.bridge,
          destAddress: testAccountAddress,
        };

        const { result } = renderHookWithProvider(
          () => useRecipientDisplayData(),
          {
            state: testState,
          },
        );

        expect(result.current).toEqual({
          destinationDisplayName: 'My Test Account',
          destinationWalletName: undefined,
          destinationAccountAddress: testAccountAddress,
        });
      });
    });

    describe('with multichain accounts state 2 enabled', () => {
      it('returns account group name when available', () => {
        const testState = createBridgeTestState();

        testState.engine = {
          ...testState.engine,
          backgroundState: {
            ...testState.engine?.backgroundState,
            RemoteFeatureFlagController: {
              ...testState.engine?.backgroundState?.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...testState.engine?.backgroundState
                  ?.RemoteFeatureFlagController?.remoteFeatureFlags,
                multichainAccountsState2: true,
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: testAccountId,
                accounts: {
                  [testAccountId]: {
                    id: testAccountId,
                    address: testAccountAddress,
                    metadata: {
                      name: 'Account Name',
                      lastSelected: 0,
                    },
                    type: EthAccountType.Eoa,
                    scopes: [EthScope.Eoa],
                  },
                },
              },
            },
            AccountTreeController: {
              accountTree: {
                selectedAccountGroup: `${AccountWalletType.Entropy}:wallet1/0`,
                wallets: {
                  [`${AccountWalletType.Entropy}:wallet1`]: {
                    id: `${AccountWalletType.Entropy}:wallet1`,
                    type: AccountWalletType.Entropy,
                    metadata: {
                      name: 'Wallet 1',
                      entropy: {
                        id: 'wallet1',
                      },
                    },
                    groups: {
                      [`${AccountWalletType.Entropy}:wallet1/0`]: {
                        id: `${AccountWalletType.Entropy}:wallet1/0`,
                        type: AccountGroupType.MultichainAccount,
                        metadata: {
                          name: 'Group Display Name',
                          pinned: false,
                          hidden: false,
                          entropy: {
                            groupIndex: 0,
                          },
                        },
                        accounts: [testAccountId],
                      },
                    },
                  },
                },
              },
            },
          },
        };

        testState.bridge = {
          ...testState.bridge,
          destAddress: testAccountAddress,
        };

        const { result } = renderHookWithProvider(
          () => useRecipientDisplayData(),
          {
            state: testState,
          },
        );

        expect(result.current).toEqual({
          destinationDisplayName: 'Group Display Name',
          destinationWalletName: 'Wallet 1',
          destinationAccountAddress: testAccountAddress,
        });
      });

      it('falls back to account metadata name when account group is not found', () => {
        const testState = createBridgeTestState();

        testState.engine = {
          ...testState.engine,
          backgroundState: {
            ...testState.engine?.backgroundState,
            RemoteFeatureFlagController: {
              ...testState.engine?.backgroundState?.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...testState.engine?.backgroundState
                  ?.RemoteFeatureFlagController?.remoteFeatureFlags,
                multichainAccountsState2: true,
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: testAccountId,
                accounts: {
                  [testAccountId]: {
                    id: testAccountId,
                    address: testAccountAddress,
                    metadata: {
                      name: 'Fallback Account Name',
                      lastSelected: 0,
                    },
                    type: EthAccountType.Eoa,
                    scopes: [EthScope.Eoa],
                  },
                },
              },
            },
            AccountTreeController: {
              accountTree: {
                selectedAccountGroup: `${AccountWalletType.Entropy}:wallet1/0`,
                wallets: {},
              },
            },
          },
        };

        testState.bridge = {
          ...testState.bridge,
          destAddress: testAccountAddress,
        };

        const { result } = renderHookWithProvider(
          () => useRecipientDisplayData(),
          {
            state: testState,
          },
        );

        expect(result.current).toEqual({
          destinationDisplayName: 'Fallback Account Name',
          destinationWalletName: undefined,
          destinationAccountAddress: testAccountAddress,
        });
      });

      it('includes wallet name when multiple wallets exist', () => {
        const testState = createBridgeTestState();

        testState.engine = {
          ...testState.engine,
          backgroundState: {
            ...testState.engine?.backgroundState,
            RemoteFeatureFlagController: {
              ...testState.engine?.backgroundState?.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...testState.engine?.backgroundState
                  ?.RemoteFeatureFlagController?.remoteFeatureFlags,
                multichainAccountsState2: true,
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: testAccountId,
                accounts: {
                  [testAccountId]: {
                    id: testAccountId,
                    address: testAccountAddress,
                    metadata: {
                      name: 'Account 1',
                      lastSelected: 0,
                    },
                    type: EthAccountType.Eoa,
                    scopes: [EthScope.Eoa],
                  },
                },
              },
            },
            AccountTreeController: {
              accountTree: {
                selectedAccountGroup: `${AccountWalletType.Entropy}:wallet1/0`,
                wallets: {
                  [`${AccountWalletType.Entropy}:wallet1`]: {
                    id: `${AccountWalletType.Entropy}:wallet1`,
                    type: AccountWalletType.Entropy,
                    metadata: {
                      name: 'First Wallet',
                      entropy: {
                        id: 'wallet1',
                      },
                    },
                    groups: {
                      [`${AccountWalletType.Entropy}:wallet1/0`]: {
                        id: `${AccountWalletType.Entropy}:wallet1/0`,
                        type: AccountGroupType.MultichainAccount,
                        metadata: {
                          name: 'Group 1',
                          pinned: false,
                          hidden: false,
                          entropy: {
                            groupIndex: 0,
                          },
                        },
                        accounts: [testAccountId],
                      },
                    },
                  },
                  [`${AccountWalletType.Entropy}:wallet2`]: {
                    id: `${AccountWalletType.Entropy}:wallet2`,
                    type: AccountWalletType.Entropy,
                    metadata: {
                      name: 'Second Wallet',
                      entropy: {
                        id: 'wallet2',
                      },
                    },
                    groups: {
                      [`${AccountWalletType.Entropy}:wallet2/0`]: {
                        id: `${AccountWalletType.Entropy}:wallet2/0`,
                        type: AccountGroupType.MultichainAccount,
                        metadata: {
                          name: 'Group 2',
                          pinned: false,
                          hidden: false,
                          entropy: {
                            groupIndex: 0,
                          },
                        },
                        accounts: [testAccountId2],
                      },
                    },
                  },
                },
              },
            },
          },
        };

        testState.bridge = {
          ...testState.bridge,
          destAddress: testAccountAddress,
        };

        const { result } = renderHookWithProvider(
          () => useRecipientDisplayData(),
          {
            state: testState,
          },
        );

        expect(result.current).toEqual({
          destinationDisplayName: 'Group 1',
          destinationWalletName: 'First Wallet',
          destinationAccountAddress: testAccountAddress,
        });
      });

      it('includes wallet name even when only one wallet exists', () => {
        const testState = createBridgeTestState();

        testState.engine = {
          ...testState.engine,
          backgroundState: {
            ...testState.engine?.backgroundState,
            RemoteFeatureFlagController: {
              ...testState.engine?.backgroundState?.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...testState.engine?.backgroundState
                  ?.RemoteFeatureFlagController?.remoteFeatureFlags,
                multichainAccountsState2: true,
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: testAccountId,
                accounts: {
                  [testAccountId]: {
                    id: testAccountId,
                    address: testAccountAddress,
                    metadata: {
                      name: 'Account 1',
                      lastSelected: 0,
                    },
                    type: EthAccountType.Eoa,
                    scopes: [EthScope.Eoa],
                  },
                },
              },
            },
            AccountTreeController: {
              accountTree: {
                selectedAccountGroup: `${AccountWalletType.Entropy}:wallet1/0`,
                wallets: {
                  [`${AccountWalletType.Entropy}:wallet1`]: {
                    id: `${AccountWalletType.Entropy}:wallet1`,
                    type: AccountWalletType.Entropy,
                    metadata: {
                      name: 'Only Wallet',
                      entropy: {
                        id: 'wallet1',
                      },
                    },
                    groups: {
                      [`${AccountWalletType.Entropy}:wallet1/0`]: {
                        id: `${AccountWalletType.Entropy}:wallet1/0`,
                        type: AccountGroupType.MultichainAccount,
                        metadata: {
                          name: 'Group 1',
                          pinned: false,
                          hidden: false,
                          entropy: {
                            groupIndex: 0,
                          },
                        },
                        accounts: [testAccountId],
                      },
                    },
                  },
                },
              },
            },
          },
        };

        testState.bridge = {
          ...testState.bridge,
          destAddress: testAccountAddress,
        };

        const { result } = renderHookWithProvider(
          () => useRecipientDisplayData(),
          {
            state: testState,
          },
        );

        expect(result.current).toEqual({
          destinationDisplayName: 'Group 1',
          destinationWalletName: 'Only Wallet',
          destinationAccountAddress: testAccountAddress,
        });
      });

      it('returns undefined wallet name when walletId exists in map but wallet does not exist in walletsMap', () => {
        const testState = createBridgeTestState();

        testState.engine = {
          ...testState.engine,
          backgroundState: {
            ...testState.engine?.backgroundState,
            RemoteFeatureFlagController: {
              ...testState.engine?.backgroundState?.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...testState.engine?.backgroundState
                  ?.RemoteFeatureFlagController?.remoteFeatureFlags,
                multichainAccountsState2: true,
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: testAccountId,
                accounts: {
                  [testAccountId]: {
                    id: testAccountId,
                    address: testAccountAddress,
                    metadata: {
                      name: 'Account 1',
                      lastSelected: 0,
                    },
                    type: EthAccountType.Eoa,
                    scopes: [EthScope.Eoa],
                  },
                },
              },
            },
            AccountTreeController: {
              accountTree: {
                selectedAccountGroup: `${AccountWalletType.Entropy}:wallet1/0`,
                wallets: {
                  [`${AccountWalletType.Entropy}:wallet1`]: {
                    id: `${AccountWalletType.Entropy}:wallet1`,
                    type: AccountWalletType.Entropy,
                    metadata: {
                      name: 'Wallet 1',
                      entropy: {
                        id: 'wallet1',
                      },
                    },
                    groups: {
                      [`${AccountWalletType.Entropy}:wallet1/0`]: {
                        id: `${AccountWalletType.Entropy}:wallet1/0`,
                        type: AccountGroupType.MultichainAccount,
                        metadata: {
                          name: 'Group 1',
                          pinned: false,
                          hidden: false,
                          entropy: {
                            groupIndex: 0,
                          },
                        },
                        accounts: [testAccountId],
                      },
                    },
                  },
                  [`${AccountWalletType.Entropy}:wallet2`]: {
                    id: `${AccountWalletType.Entropy}:wallet2`,
                    type: AccountWalletType.Entropy,
                    metadata: {
                      name: 'Wallet 2',
                      entropy: {
                        id: 'wallet2',
                      },
                    },
                    groups: {},
                  },
                },
              },
            },
          },
        };

        testState.bridge = {
          ...testState.bridge,
          destAddress: testAccountAddress,
        };

        const { result } = renderHookWithProvider(
          () => useRecipientDisplayData(),
          {
            state: testState,
          },
        );

        expect(result.current).toEqual({
          destinationDisplayName: 'Group 1',
          destinationWalletName: 'Wallet 1',
          destinationAccountAddress: testAccountAddress,
        });
      });

      it('returns undefined wallet name when walletId is not in accountToWalletMap', () => {
        const testState = createBridgeTestState();

        testState.engine = {
          ...testState.engine,
          backgroundState: {
            ...testState.engine?.backgroundState,
            RemoteFeatureFlagController: {
              ...testState.engine?.backgroundState?.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...testState.engine?.backgroundState
                  ?.RemoteFeatureFlagController?.remoteFeatureFlags,
                multichainAccountsState2: true,
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: testAccountId,
                accounts: {
                  [testAccountId]: {
                    id: testAccountId,
                    address: testAccountAddress,
                    metadata: {
                      name: 'Account 1',
                      lastSelected: 0,
                    },
                    type: EthAccountType.Eoa,
                    scopes: [EthScope.Eoa],
                  },
                },
              },
            },
            AccountTreeController: {
              accountTree: {
                selectedAccountGroup: `${AccountWalletType.Entropy}:wallet1/0`,
                wallets: {
                  [`${AccountWalletType.Entropy}:wallet1`]: {
                    id: `${AccountWalletType.Entropy}:wallet1`,
                    type: AccountWalletType.Entropy,
                    metadata: {
                      name: 'Wallet 1',
                      entropy: {
                        id: 'wallet1',
                      },
                    },
                    groups: {
                      [`${AccountWalletType.Entropy}:wallet1/0`]: {
                        id: `${AccountWalletType.Entropy}:wallet1/0`,
                        type: AccountGroupType.MultichainAccount,
                        metadata: {
                          name: 'Group 1',
                          pinned: false,
                          hidden: false,
                          entropy: {
                            groupIndex: 0,
                          },
                        },
                        accounts: [], // Account not in this group
                      },
                    },
                  },
                  [`${AccountWalletType.Entropy}:wallet2`]: {
                    id: `${AccountWalletType.Entropy}:wallet2`,
                    type: AccountWalletType.Entropy,
                    metadata: {
                      name: 'Wallet 2',
                      entropy: {
                        id: 'wallet2',
                      },
                    },
                    groups: {},
                  },
                },
              },
            },
          },
        };

        testState.bridge = {
          ...testState.bridge,
          destAddress: testAccountAddress,
        };

        const { result } = renderHookWithProvider(
          () => useRecipientDisplayData(),
          {
            state: testState,
          },
        );

        expect(result.current).toEqual({
          destinationDisplayName: 'Account 1',
          destinationWalletName: undefined,
          destinationAccountAddress: testAccountAddress,
        });
      });

      it('handles case where walletsMap is empty but multichain is enabled', () => {
        const testState = createBridgeTestState();

        testState.engine = {
          ...testState.engine,
          backgroundState: {
            ...testState.engine?.backgroundState,
            RemoteFeatureFlagController: {
              ...testState.engine?.backgroundState?.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...testState.engine?.backgroundState
                  ?.RemoteFeatureFlagController?.remoteFeatureFlags,
                multichainAccountsState2: true,
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: testAccountId,
                accounts: {
                  [testAccountId]: {
                    id: testAccountId,
                    address: testAccountAddress,
                    metadata: {
                      name: 'Account Name',
                      lastSelected: 0,
                    },
                    type: EthAccountType.Eoa,
                    scopes: [EthScope.Eoa],
                  },
                },
              },
            },
            AccountTreeController: {
              accountTree: {
                selectedAccountGroup: `${AccountWalletType.Entropy}:wallet1/0`,
                wallets: {},
              },
            },
          },
        };

        testState.bridge = {
          ...testState.bridge,
          destAddress: testAccountAddress,
        };

        const { result } = renderHookWithProvider(
          () => useRecipientDisplayData(),
          {
            state: testState,
          },
        );

        expect(result.current).toEqual({
          destinationDisplayName: 'Account Name',
          destinationWalletName: undefined,
          destinationAccountAddress: testAccountAddress,
        });
      });
    });

    describe('address matching', () => {
      it('matches addresses case-insensitively', () => {
        const lowerCaseAddress =
          '0xabcdef1234567890abcdef1234567890abcdef12' as Hex;
        const upperCaseAddress =
          '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' as Hex;

        const testState = createBridgeTestState({
          bridgeReducerOverrides: {
            destAddress: upperCaseAddress,
          },
        });

        testState.engine = {
          ...testState.engine,
          backgroundState: {
            ...testState.engine?.backgroundState,
            RemoteFeatureFlagController: {
              ...testState.engine?.backgroundState?.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...testState.engine?.backgroundState
                  ?.RemoteFeatureFlagController?.remoteFeatureFlags,
                multichainAccountsState2: false,
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: testAccountId,
                accounts: {
                  [testAccountId]: {
                    id: testAccountId,
                    address: lowerCaseAddress,
                    metadata: {
                      name: 'Case Test Account',
                      lastSelected: 0,
                    },
                    type: EthAccountType.Eoa,
                    scopes: [EthScope.Eoa],
                  },
                },
              },
            },
          },
        };

        const { result } = renderHookWithProvider(
          () => useRecipientDisplayData(),
          {
            state: testState,
          },
        );

        expect(result.current.destinationDisplayName).toBe('Case Test Account');
        expect(result.current.destinationAccountAddress).toBe(lowerCaseAddress);
      });
    });
  });

  describe('memoization', () => {
    it('returns the same object reference when dependencies do not change', () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          destAddress: testAccountAddress,
        },
      });

      testState.engine = {
        ...testState.engine,
        backgroundState: {
          ...testState.engine?.backgroundState,
          AccountsController: {
            internalAccounts: {
              selectedAccount: testAccountId,
              accounts: {
                [testAccountId]: {
                  id: testAccountId,
                  address: testAccountAddress,
                  metadata: {
                    name: 'Memo Test Account',
                    lastSelected: 0,
                  },
                  type: EthAccountType.Eoa,
                  scopes: [EthScope.Eoa],
                },
              },
            },
          },
        },
      };

      const { result, rerender } = renderHookWithProvider(
        () => useRecipientDisplayData(),
        {
          state: testState,
        },
      );

      const firstResult = result.current;
      rerender({ state: testState });
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });
  });
});
