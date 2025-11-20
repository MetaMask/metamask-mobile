import '../../_mocks_/initialState';
import { createBridgeTestState } from '../../testUtils';
import { useRecipientDisplayData } from './useRecipientDisplayData';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { Hex } from '@metamask/utils';
import { EthAccountType, EthScope } from '@metamask/keyring-api';
import { AccountWalletType, AccountGroupType } from '@metamask/account-api';

const ADDR = '0xabcdef1234567890abcdef1234567890abcdef12' as Hex;
const ADDR_UPPER = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' as Hex;
const EXTERNAL_ADDR = '0x1111111111111111111111111111111111111111' as Hex;

const createAccount = (id: string, address: Hex, name: string) => ({
  [id]: {
    id,
    address,
    metadata: { name, lastSelected: 0 },
    type: EthAccountType.Eoa,
    scopes: [EthScope.Eoa],
  },
});

const createWallet = (
  walletId: string,
  walletName: string,
  groupId: string,
  groupName: string,
  accountIds: string[],
) => ({
  [`${AccountWalletType.Entropy}:${walletId}`]: {
    id: `${AccountWalletType.Entropy}:${walletId}`,
    type: AccountWalletType.Entropy,
    metadata: { name: walletName, entropy: { id: walletId } },
    groups: {
      [`${AccountWalletType.Entropy}:${walletId}/${groupId}`]: {
        id: `${AccountWalletType.Entropy}:${walletId}/${groupId}`,
        type: AccountGroupType.MultichainAccount,
        metadata: {
          name: groupName,
          pinned: false,
          hidden: false,
          entropy: { groupIndex: Number(groupId) },
        },
        accounts: accountIds,
      },
    },
  },
});

const setupMultichainState = (
  accountId: string,
  address: Hex,
  accountName: string,
  options: {
    multichainEnabled?: boolean;
    groupName?: string;
    walletName?: string;
    walletsMap?: object;
    emptyWalletsMap?: boolean;
  } = {},
) => {
  const state = createBridgeTestState({
    bridgeReducerOverrides: { destAddress: address },
  });
  const multichainEnabled = options.multichainEnabled ?? true;

  state.engine = {
    ...state.engine,
    backgroundState: {
      ...state.engine?.backgroundState,
      RemoteFeatureFlagController: {
        ...state.engine?.backgroundState?.RemoteFeatureFlagController,
        remoteFeatureFlags: {
          ...state.engine?.backgroundState?.RemoteFeatureFlagController
            ?.remoteFeatureFlags,
          multichainAccountsState2: multichainEnabled,
        },
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: accountId,
          accounts: createAccount(accountId, address, accountName),
        },
      },
      ...(multichainEnabled && {
        AccountTreeController: {
          accountTree: {
            selectedAccountGroup: `${AccountWalletType.Entropy}:wallet1/0`,
            wallets: options.emptyWalletsMap
              ? {}
              : (options.walletsMap ??
                createWallet(
                  'wallet1',
                  options.walletName ?? 'Wallet 1',
                  '0',
                  options.groupName ?? accountName,
                  [accountId],
                )),
          },
        },
      }),
    },
  };

  return state;
};

describe('useRecipientDisplayData', () => {
  const accountId = 'testAccountId';

  beforeEach(() => jest.clearAllMocks());

  // Keep any typing for tests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderHook = (state: any) =>
    renderHookWithProvider(() => useRecipientDisplayData(), { state }).result
      .current;

  it('returns undefined for all fields when destAddress is not set', () => {
    const state = createBridgeTestState({
      bridgeReducerOverrides: { destAddress: undefined },
    });

    expect(renderHook(state)).toEqual({
      destinationDisplayName: undefined,
      destinationWalletName: undefined,
      destinationAccountAddress: undefined,
    });
  });

  it('returns external address without display name or wallet name', () => {
    const state = createBridgeTestState({
      bridgeReducerOverrides: { destAddress: EXTERNAL_ADDR },
    });

    expect(renderHook(state)).toEqual({
      destinationDisplayName: undefined,
      destinationWalletName: undefined,
      destinationAccountAddress: EXTERNAL_ADDR,
    });
  });

  describe('with multichain disabled', () => {
    it('returns account metadata name without wallet name', () => {
      const state = setupMultichainState(accountId, ADDR, 'My Account', {
        multichainEnabled: false,
      });

      expect(renderHook(state)).toEqual({
        destinationDisplayName: 'My Account',
        destinationWalletName: undefined,
        destinationAccountAddress: ADDR,
      });
    });

    it('matches addresses case-insensitively', () => {
      const state = setupMultichainState(accountId, ADDR, 'Case Test', {
        multichainEnabled: false,
      });
      state.bridge.destAddress = ADDR_UPPER;

      const result = renderHook(state);
      expect(result.destinationDisplayName).toBe('Case Test');
      expect(result.destinationAccountAddress).toBe(ADDR);
    });
  });

  describe('with multichain enabled', () => {
    it('returns account group name and wallet name when available', () => {
      const state = setupMultichainState(accountId, ADDR, 'Account', {
        groupName: 'Group Name',
        walletName: 'My Wallet',
      });

      expect(renderHook(state)).toEqual({
        destinationDisplayName: 'Group Name',
        destinationWalletName: 'My Wallet',
        destinationAccountAddress: ADDR,
      });
    });

    it('falls back to account name when account group not found', () => {
      const state = setupMultichainState(accountId, ADDR, 'Fallback Account', {
        emptyWalletsMap: true,
      });

      expect(renderHook(state)).toEqual({
        destinationDisplayName: 'Fallback Account',
        destinationWalletName: undefined,
        destinationAccountAddress: ADDR,
      });
    });

    it('includes wallet name with multiple wallets', () => {
      const wallets = {
        ...createWallet('wallet1', 'First Wallet', '0', 'Group 1', [accountId]),
        ...createWallet('wallet2', 'Second Wallet', '0', 'Group 2', [
          'otherAccount',
        ]),
      };
      const state = setupMultichainState(accountId, ADDR, 'Account', {
        walletsMap: wallets,
        groupName: 'Group 1',
      });

      expect(renderHook(state)).toEqual({
        destinationDisplayName: 'Group 1',
        destinationWalletName: 'First Wallet',
        destinationAccountAddress: ADDR,
      });
    });

    it('includes wallet name with single wallet', () => {
      const state = setupMultichainState(accountId, ADDR, 'Account', {
        groupName: 'Group 1',
        walletName: 'Only Wallet',
      });

      expect(renderHook(state)).toEqual({
        destinationDisplayName: 'Group 1',
        destinationWalletName: 'Only Wallet',
        destinationAccountAddress: ADDR,
      });
    });

    it('returns undefined wallet name when walletId not in accountToWalletMap', () => {
      const wallets = {
        ...createWallet('wallet1', 'Wallet 1', '0', 'Group 1', []),
        ...createWallet('wallet2', 'Wallet 2', '0', 'Group 2', []),
      };
      const state = setupMultichainState(accountId, ADDR, 'Account 1', {
        walletsMap: wallets,
      });

      expect(renderHook(state)).toEqual({
        destinationDisplayName: 'Account 1',
        destinationWalletName: undefined,
        destinationAccountAddress: ADDR,
      });
    });

    it('handles empty walletsMap', () => {
      const state = setupMultichainState(accountId, ADDR, 'Account', {
        emptyWalletsMap: true,
      });

      expect(renderHook(state)).toEqual({
        destinationDisplayName: 'Account',
        destinationWalletName: undefined,
        destinationAccountAddress: ADDR,
      });
    });
  });

  describe('memoization', () => {
    it('returns same object reference when dependencies unchanged', () => {
      const state = setupMultichainState(accountId, ADDR, 'Memo Test', {
        multichainEnabled: false,
      });

      const { result, rerender } = renderHookWithProvider(
        () => useRecipientDisplayData(),
        { state },
      );
      const firstResult = result.current;
      rerender({ state });

      expect(result.current).toBe(firstResult);
    });
  });
});
