import { act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AccountGroupId, AccountWalletType } from '@metamask/account-api';
import type { AccountWalletObject } from '@metamask/account-tree-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import Engine from '../../../core/Engine';
import { RootState } from '../../../reducers';
import {
  createMockAccountGroup,
  createMockEntropyWallet,
  createMockHiddenAccountGroup,
  createMockInternalAccount,
  createMockState,
  createMockWallet,
} from '../../../component-library/components-temp/MultichainAccounts/test-utils';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import useManageAccountsView from './useManageAccountsView';
import { ManageAccountRowVariant } from './components/ManageAccountRow';

jest.mock('../../../core/Engine', () => ({
  context: {
    AccountTreeController: {
      setAccountGroupHidden: jest.fn(),
      syncWithUserStorage: jest.fn(),
    },
    KeyringController: {
      removeAccount: jest.fn(),
    },
  },
}));

jest.mock('../../../core/Permissions', () => ({
  removeAccountsFromPermissions: jest.fn(),
}));

const mockSetAccountGroupHidden = jest.mocked(
  Engine.context.AccountTreeController.setAccountGroupHidden,
);
const mockRemoveAccount = jest.mocked(
  Engine.context.KeyringController.removeAccount,
);

const createBaseState = () => {
  const visibleGroup = createMockAccountGroup('keyring:wallet-1/1', 'Group 1');
  const hiddenGroup = createMockHiddenAccountGroup(
    'keyring:wallet-1/2',
    'Group 2',
  );
  const wallet1 = createMockWallet('keyring:wallet-1', 'Wallet 1', [
    visibleGroup,
    hiddenGroup,
  ]);
  const entropyGroup = createMockAccountGroup('entropy:wallet-2/1', 'Group 3');
  const wallet2 = createMockEntropyWallet('entropy:wallet-2', 'Wallet 2', [
    entropyGroup,
  ]);

  return {
    state: {
      ...createMockState([wallet1, wallet2], {}),
      settings: { avatarAccountType: 'JazzIcon' },
    } as unknown as RootState,
    visibleGroupId: 'keyring:wallet-1/1' as AccountGroupId,
    hiddenGroupId: 'keyring:wallet-1/2' as AccountGroupId,
  };
};

describe('useManageAccountsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps sections from the unfiltered account groups selector', () => {
    // Arrange
    const { state } = createBaseState();

    // Act
    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    // Assert
    expect(result.current.sections).toHaveLength(2);
    expect(result.current.sections[0].walletName).toBe('Wallet 1');
    expect(result.current.sections[0].groups.map((group) => group.id)).toEqual([
      'keyring:wallet-1/1',
      'keyring:wallet-1/2',
    ]);
    expect(result.current.sections[1].walletName).toBe('Wallet 2');
    expect(result.current.sections[1].groups.map((group) => group.id)).toEqual([
      'entropy:wallet-2/1',
    ]);
  });

  it('keeps hidden groups in sections (manage screen shows hidden groups)', () => {
    // Arrange
    const { state, hiddenGroupId } = createBaseState();

    // Act
    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    // Assert
    expect(
      result.current.sections[0].groups.some(
        (group) => group.id === hiddenGroupId,
      ),
    ).toBe(true);
  });

  it('derives the hidden map from the hidden account group IDs selector', () => {
    // Arrange
    const { state, hiddenGroupId, visibleGroupId } = createBaseState();

    // Act
    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    // Assert
    expect(result.current.isHiddenByGroupId).toEqual({
      [hiddenGroupId]: true,
    });
    expect(result.current.isHiddenByGroupId[visibleGroupId]).toBeUndefined();
  });

  it('sources avatarAccountType from the settings selector', () => {
    // Arrange
    const { state } = createBaseState();

    // Act
    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    // Assert
    expect(result.current.avatarAccountType).toBe('JazzIcon');
  });

  it('passes toggles through to useToggleAccountGroupHidden for a visible group', () => {
    // Arrange
    const { state, visibleGroupId } = createBaseState();
    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    // Act
    act(() => {
      result.current.onToggleHidden(visibleGroupId, true);
    });

    // Assert
    expect(mockSetAccountGroupHidden).toHaveBeenCalledTimes(1);
    expect(mockSetAccountGroupHidden).toHaveBeenCalledWith(
      visibleGroupId,
      true,
    );
  });

  it('passes toggles through to useToggleAccountGroupHidden for a hidden group', () => {
    // Arrange
    const { state, hiddenGroupId } = createBaseState();
    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    // Act
    act(() => {
      result.current.onToggleHidden(hiddenGroupId, false);
    });

    // Assert
    expect(mockSetAccountGroupHidden).toHaveBeenCalledTimes(1);
    expect(mockSetAccountGroupHidden).toHaveBeenCalledWith(
      hiddenGroupId,
      false,
    );
  });

  it('does not call syncWithUserStorage when toggling hidden state', () => {
    // Arrange
    const { state, visibleGroupId } = createBaseState();
    const mockSyncWithUserStorage = jest.mocked(
      Engine.context.AccountTreeController.syncWithUserStorage,
    );
    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    // Act
    act(() => {
      result.current.onToggleHidden(visibleGroupId, true);
    });

    // Assert
    expect(mockSyncWithUserStorage).not.toHaveBeenCalled();
  });

  describe('per-section affordances (type → variant / lock / footer)', () => {
    const buildVariantState = (
      wallets: AccountWalletObject[],
      internalAccounts: Record<
        string,
        ReturnType<typeof createMockInternalAccount>
      > = {},
    ) =>
      ({
        ...createMockState(wallets, internalAccounts),
        settings: { avatarAccountType: 'JazzIcon' },
      }) as unknown as RootState;

    it('maps entropy groups to the Hide variant with footer and lock state', () => {
      // Arrange
      const group = createMockAccountGroup('entropy:w1/0', 'Group 1');
      const wallet = createMockEntropyWallet('entropy:w1', 'Wallet 1', [group]);

      // Act
      const { result } = renderHookWithProvider(() => useManageAccountsView(), {
        state: buildVariantState([wallet]),
      });

      // Assert
      expect(result.current.sections[0]).toMatchObject({
        walletId: 'entropy:w1',
        isLocked: true,
        showsAddAccountFooter: true,
        rowVariantByGroupId: {
          'entropy:w1/0': ManageAccountRowVariant.Hide,
        },
      });
    });

    it('maps hardware groups to the HideAndRemove variant with footer and no lock state', () => {
      // Arrange
      const group = createMockAccountGroup('keyring:hw/0', 'Ledger 1');
      const hardwareWallet = {
        id: 'keyring:hw',
        type: AccountWalletType.Keyring,
        metadata: {
          name: 'Ledger',
          keyring: { type: KeyringTypes.ledger },
        },
        groups: { 'keyring:hw/0': group },
      } as unknown as AccountWalletObject;

      // Act
      const { result } = renderHookWithProvider(() => useManageAccountsView(), {
        state: buildVariantState([hardwareWallet]),
      });

      // Assert
      expect(result.current.sections[0]).toMatchObject({
        walletId: 'keyring:hw',
        isLocked: false,
        showsAddAccountFooter: true,
        rowVariantByGroupId: {
          'keyring:hw/0': ManageAccountRowVariant.HideAndRemove,
        },
      });
    });

    it('maps imported groups to the Remove variant with no footer and no lock state', () => {
      // Arrange
      const group = createMockAccountGroup('keyring:imported/0', 'Imported 1');
      const importedWallet = createMockWallet('keyring:imported', 'Imported', [
        group,
      ]);

      // Act
      const { result } = renderHookWithProvider(() => useManageAccountsView(), {
        state: buildVariantState([importedWallet]),
      });

      // Assert
      expect(result.current.sections[0]).toMatchObject({
        walletId: 'keyring:imported',
        isLocked: false,
        showsAddAccountFooter: false,
        rowVariantByGroupId: {
          'keyring:imported/0': ManageAccountRowVariant.Remove,
        },
      });
    });

    it('maps snap groups to the None variant with no footer and no lock state', () => {
      // Arrange
      const group = createMockAccountGroup('snap:foo/0', 'Snap 1');
      const snapWallet = {
        id: 'snap:foo',
        type: AccountWalletType.Snap,
        metadata: {
          name: 'Snap Wallet',
          snap: { id: 'npm:@metamask/snap' },
        },
        groups: { 'snap:foo/0': group },
      } as unknown as AccountWalletObject;

      // Act
      const { result } = renderHookWithProvider(() => useManageAccountsView(), {
        state: buildVariantState([snapWallet]),
      });

      // Assert
      expect(result.current.sections[0]).toMatchObject({
        walletId: 'snap:foo',
        isLocked: false,
        showsAddAccountFooter: false,
        rowVariantByGroupId: {
          'snap:foo/0': ManageAccountRowVariant.None,
        },
      });
    });
  });

  describe('onRemoveAccount', () => {
    it('shows the confirm Alert and removes the hardware account from the keyring', async () => {
      // Arrange
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {
        // No-op: the remove button is fired explicitly below.
      });
      const group = createMockAccountGroup('keyring:hw/0', 'Ledger 1');
      const hardwareWallet = {
        id: 'keyring:hw',
        type: AccountWalletType.Keyring,
        metadata: {
          name: 'Ledger',
          keyring: { type: KeyringTypes.ledger },
        },
        groups: { 'keyring:hw/0': group },
      } as unknown as AccountWalletObject;
      const internalAccount = createMockInternalAccount(
        'account-keyring:hw/0',
        '0xabc',
        'Ledger 1',
      );
      const state = {
        ...createMockState([hardwareWallet], {
          'account-keyring:hw/0': internalAccount,
        }),
        settings: { avatarAccountType: 'JazzIcon' },
      } as unknown as RootState;
      const { result } = renderHookWithProvider(() => useManageAccountsView(), {
        state,
      });

      // Act
      act(() => {
        result.current.onRemoveAccount('keyring:hw/0');
      });
      const [, , buttons] = alertSpy.mock.calls[0];
      const removeButton = buttons?.find((button) => button?.text === 'Remove');
      await act(async () => {
        await removeButton?.onPress?.();
      });

      // Assert
      const { removeAccountsFromPermissions } = jest.requireMock(
        '../../../core/Permissions',
      ) as { removeAccountsFromPermissions: jest.Mock };
      expect(removeAccountsFromPermissions).toHaveBeenCalledWith([
        expect.anything(),
      ]);
      expect(mockRemoveAccount).toHaveBeenCalledTimes(1);
    });

    it('navigates to the delete-account sheet for an imported group', () => {
      // Arrange
      const group = createMockAccountGroup('keyring:imported/0', 'Imported 1');
      const importedWallet = createMockWallet('keyring:imported', 'Imported', [
        group,
      ]);
      const internalAccount = createMockInternalAccount(
        'account-keyring:imported/0',
        '0xdef',
        'Imported 1',
      );
      const state = {
        ...createMockState([importedWallet], {
          'account-keyring:imported/0': internalAccount,
        }),
        settings: { avatarAccountType: 'JazzIcon' },
      } as unknown as RootState;
      const navigateToDeleteAccount = jest.fn();
      const { result } = renderHookWithProvider(
        () => useManageAccountsView({ navigateToDeleteAccount }),
        { state },
      );

      // Act
      act(() => {
        result.current.onRemoveAccount('keyring:imported/0');
      });

      // Assert
      expect(navigateToDeleteAccount).toHaveBeenCalledTimes(1);
      expect(navigateToDeleteAccount).toHaveBeenCalledWith(internalAccount);
      expect(mockRemoveAccount).not.toHaveBeenCalled();
    });

    it('does nothing when the group cannot be resolved', () => {
      // Arrange
      const { state } = createBaseState();
      const navigateToDeleteAccount = jest.fn();
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {
        // No-op: no alert is expected for an unknown group.
      });
      const { result } = renderHookWithProvider(
        () => useManageAccountsView({ navigateToDeleteAccount }),
        { state },
      );

      // Act
      act(() => {
        result.current.onRemoveAccount('entropy:unknown/0');
      });

      // Assert
      expect(alertSpy).not.toHaveBeenCalled();
      expect(navigateToDeleteAccount).not.toHaveBeenCalled();
    });
  });

  it('exposes a stable onAddAccount for the add-account footers', () => {
    // Arrange
    const { state } = createBaseState();
    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    // Act
    let firstResult: unknown;
    act(() => {
      firstResult = result.current.onAddAccount('Wallet 1');
    });

    // Assert — creation is owned by the reused AccountListFooter; the
    // handler only needs to exist (and stay stable) for footers to render.
    expect(firstResult).toBeUndefined();
    expect(result.current.onAddAccount).toBeDefined();
  });
});
