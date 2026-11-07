import { act } from '@testing-library/react-native';
import { AccountGroupId, AccountWalletType } from '@metamask/account-api';
import type { AccountWalletObject } from '@metamask/account-tree-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import Engine from '../../../../core/Engine';
import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import { AccountHiddenLocation } from '../../../../core/Analytics/events/accounts';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  createMockAccountGroup,
  createMockEntropyWallet,
  createMockHiddenAccountGroup,
  createMockState,
  createMockWallet,
} from '../../../../component-library/components-temp/MultichainAccounts/test-utils';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useToggleAccountGroupHidden from './useToggleAccountGroupHidden';

jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountTreeController: {
      setAccountGroupHidden: jest.fn(),
      syncWithUserStorage: jest.fn(),
      state: { accountTree: { wallets: {} } },
    },
  },
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics');

const mockTrackEvent = jest.fn();
const mockSetAccountGroupHidden = jest.mocked(
  Engine.context.AccountTreeController.setAccountGroupHidden,
);
const mockSyncWithUserStorage = jest.mocked(
  Engine.context.AccountTreeController.syncWithUserStorage,
);

/**
 * Points the mocked controller at the given wallets and applies hide writes
 * to them synchronously, as the real controller does.
 */
const setControllerWallets = (wallets: AccountWalletObject[]) => {
  const walletMap = Object.fromEntries(
    wallets.map((wallet) => [wallet.id, wallet]),
  );
  jest.replaceProperty(Engine.context.AccountTreeController, 'state', {
    ...Engine.context.AccountTreeController.state,
    accountTree: {
      ...Engine.context.AccountTreeController.state.accountTree,
      wallets: walletMap,
    },
  });
  mockSetAccountGroupHidden.mockImplementation((groupId, hidden) => {
    const wallet = Object.values(walletMap).find(
      (candidate) => candidate.groups[groupId],
    );
    if (!wallet) {
      throw new Error(`Account group with id "${groupId}" not found in tree`);
    }
    wallet.groups[groupId] = {
      ...wallet.groups[groupId],
      metadata: { ...wallet.groups[groupId].metadata, hidden },
    } as (typeof wallet.groups)[AccountGroupId];
  });
};

const renderUseToggleAccountGroupHidden = (wallets: AccountWalletObject[]) => {
  setControllerWallets(wallets);
  return renderHookWithProvider(() => useToggleAccountGroupHidden(), {
    state: createMockState(wallets, {}),
  });
};

const accountHiddenCalls = () =>
  mockTrackEvent.mock.calls.filter(
    ([event]) => event.name === EVENT_NAME.ACCOUNT_HIDDEN,
  );

const createImportedWallet = ({ hidden = false } = {}) => {
  const groupId = 'keyring:wallet-1/1' as AccountGroupId;
  const group = hidden
    ? createMockHiddenAccountGroup(groupId, 'Group 1')
    : createMockAccountGroup(groupId, 'Group 1');
  return {
    groupId,
    wallet: createMockWallet('keyring:wallet-1', 'Wallet 1', [group]),
  };
};

describe('useToggleAccountGroupHidden', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
      }),
    );
  });

  it.each([
    {
      name: 'calls setAccountGroupHidden with true when the group is currently visible',
      hidden: false,
      expectedHidden: true,
    },
    {
      name: 'calls setAccountGroupHidden with false when the group is currently hidden',
      hidden: true,
      expectedHidden: false,
    },
  ])('$name', ({ hidden, expectedHidden }) => {
    const { groupId, wallet } = createImportedWallet({ hidden });

    const { result } = renderUseToggleAccountGroupHidden([wallet]);
    act(() => {
      result.current.toggleHidden(groupId);
    });

    expect(mockSetAccountGroupHidden).toHaveBeenCalledTimes(1);
    expect(mockSetAccountGroupHidden).toHaveBeenCalledWith(
      groupId,
      expectedHidden,
    );
  });

  it('reads hidden state from the controller, so back-to-back toggles alternate', () => {
    const { groupId, wallet } = createImportedWallet();

    const { result } = renderUseToggleAccountGroupHidden([wallet]);
    act(() => {
      result.current.toggleHidden(groupId);
      result.current.toggleHidden(groupId);
    });

    expect(mockSetAccountGroupHidden).toHaveBeenNthCalledWith(1, groupId, true);
    expect(mockSetAccountGroupHidden).toHaveBeenNthCalledWith(
      2,
      groupId,
      false,
    );
  });

  it('does not call syncWithUserStorage when toggling hidden state', () => {
    const { groupId, wallet } = createImportedWallet();

    const { result } = renderUseToggleAccountGroupHidden([wallet]);
    act(() => {
      result.current.toggleHidden(groupId);
    });

    expect(mockSyncWithUserStorage).not.toHaveBeenCalled();
  });

  describe('Account Hidden', () => {
    it('tracks a hide from Manage Accounts with the wallet account type', () => {
      const { groupId, wallet } = createImportedWallet();

      const { result } = renderUseToggleAccountGroupHidden([wallet]);
      act(() => {
        result.current.toggleHidden(groupId);
      });

      expect(accountHiddenCalls()).toHaveLength(1);
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: EVENT_NAME.ACCOUNT_HIDDEN,
          properties: {
            account_type: 'imported',
            hidden: true,
            hidden_count_after: 1,
            location: AccountHiddenLocation.ManageAccounts,
          },
        }),
      );
    });

    it('tracks an unhide with hidden set to false', () => {
      const { groupId, wallet } = createImportedWallet({ hidden: true });

      const { result } = renderUseToggleAccountGroupHidden([wallet]);
      act(() => {
        result.current.toggleHidden(groupId);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: EVENT_NAME.ACCOUNT_HIDDEN,
          properties: expect.objectContaining({
            hidden: false,
            hidden_count_after: 0,
          }),
        }),
      );
    });

    it('counts hidden accounts across every wallet after the write', () => {
      const groupId = 'entropy:wallet-1/0' as AccountGroupId;
      const entropyWallet = createMockEntropyWallet(
        'entropy:wallet-1',
        'Wallet 1',
        [
          createMockAccountGroup(groupId, 'Account 1'),
          createMockHiddenAccountGroup(
            'entropy:wallet-1/1' as AccountGroupId,
            'Account 2',
          ),
        ],
      );
      const hardwareWallet = {
        id: 'keyring:hw',
        type: AccountWalletType.Keyring,
        metadata: { name: 'Ledger', keyring: { type: KeyringTypes.ledger } },
        groups: {
          'keyring:hw/0': createMockHiddenAccountGroup(
            'keyring:hw/0' as AccountGroupId,
            'Ledger 1',
          ),
        },
      } as unknown as AccountWalletObject;

      const { result } = renderUseToggleAccountGroupHidden([
        entropyWallet,
        hardwareWallet,
      ]);
      act(() => {
        result.current.toggleHidden(groupId);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: EVENT_NAME.ACCOUNT_HIDDEN,
          properties: {
            account_type: 'metamask',
            hidden: true,
            hidden_count_after: 3,
            location: AccountHiddenLocation.ManageAccounts,
          },
        }),
      );
    });

    it('does not track when the group is not in the tree', () => {
      const { wallet } = createImportedWallet();

      const { result } = renderUseToggleAccountGroupHidden([wallet]);

      expect(() =>
        act(() => {
          result.current.toggleHidden('keyring:missing/0' as AccountGroupId);
        }),
      ).toThrow();
      expect(accountHiddenCalls()).toHaveLength(0);
    });
  });
});
