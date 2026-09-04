import { act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AccountGroupId, AccountWalletType } from '@metamask/account-api';
import type { AccountWalletObject } from '@metamask/account-tree-controller';
import Engine from '../../../core/Engine';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
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
import { forgetLedger } from '../../../core/Ledger/Ledger';
import { forgetQrDevice } from '../../../core/QrKeyring/QrKeyring';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import { strings } from '../../../../locales/i18n';
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
      getAccounts: jest.fn(),
      state: {
        keyrings: [],
      },
    },
    AccountsController: {
      state: {
        internalAccounts: {
          selectedAccount: '',
          accounts: {},
        },
      },
    },
  },
  setSelectedAddress: jest.fn(),
}));

jest.mock('../../../core/Permissions', () => ({
  removeAccountsFromPermissions: jest.fn(),
}));

jest.mock('../../../core/Ledger/Ledger', () => ({
  forgetLedger: jest.fn(),
}));

jest.mock('../../../core/QrKeyring/QrKeyring', () => ({
  forgetQrDevice: jest.fn(),
}));

const mockSetAccountGroupHidden = jest.mocked(
  Engine.context.AccountTreeController.setAccountGroupHidden,
);
const mockRemoveAccount = jest.mocked(
  Engine.context.KeyringController.removeAccount,
);
const mockGetAccounts = jest.mocked(
  Engine.context.KeyringController.getAccounts,
);
const mockSetSelectedAddress = jest.mocked(Engine.setSelectedAddress);
const mockRemoveAccountsFromPermissions = jest.mocked(
  removeAccountsFromPermissions,
);

const mockSelectedAccount = (address: string) => {
  Engine.context.AccountsController.state = {
    internalAccounts: {
      selectedAccount: 'selected',
      accounts: {
        selected: { address },
      },
    },
  } as unknown as typeof Engine.context.AccountsController.state;
};

const setKeyrings = (keyrings: { type: string; accounts: string[] }[]) => {
  Engine.context.KeyringController.state = {
    keyrings,
  } as unknown as typeof Engine.context.KeyringController.state;
};

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

const HARDWARE_ADDRESS = '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756';
const REMAINING_ADDRESS = '0x1234567890123456789012345678901234567890';

const buildHardwareWalletState = (
  keyringType: string,
  address: string = HARDWARE_ADDRESS,
) => {
  const group = createMockAccountGroup('keyring:hw/0', 'Hardware 1');
  const hardwareWallet = {
    id: 'keyring:hw',
    type: AccountWalletType.Keyring,
    metadata: {
      name: 'Hardware',
      keyring: { type: keyringType },
    },
    groups: { 'keyring:hw/0': group },
  } as unknown as AccountWalletObject;
  const internalAccount = createMockInternalAccount(
    'account-keyring:hw/0',
    address,
    'Hardware 1',
  );

  return {
    ...createMockState([hardwareWallet], {
      'account-keyring:hw/0': internalAccount,
    }),
    settings: { avatarAccountType: 'JazzIcon' },
  } as unknown as RootState;
};

const triggerHardwareRemoveAlert = async (state: RootState) => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {
    // No-op: remove button is invoked explicitly.
  });
  const { result } = renderHookWithProvider(() => useManageAccountsView(), {
    state,
  });

  act(() => {
    result.current.onRemoveAccount('keyring:hw/0');
  });

  expect(alertSpy).toHaveBeenCalledTimes(1);
  const [, , buttons] = alertSpy.mock.calls[0];
  const removeButton = buttons?.find(
    (button) =>
      button?.text === strings('accounts.remove_account_alert_remove_btn'),
  );
  await act(async () => {
    await removeButton?.onPress?.();
  });
};

describe('useManageAccountsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedAccount(REMAINING_ADDRESS);
    mockGetAccounts.mockResolvedValue([REMAINING_ADDRESS]);
    setKeyrings([
      {
        type: ExtendedKeyringTypes.ledger,
        accounts: [HARDWARE_ADDRESS],
      },
    ]);
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
    const { state, hiddenGroupId } = createBaseState();

    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    expect(
      result.current.sections[0].groups.some(
        (group) => group.id === hiddenGroupId,
      ),
    ).toBe(true);
  });

  it('derives the hidden map from the hidden account group IDs selector', () => {
    const { state, hiddenGroupId, visibleGroupId } = createBaseState();

    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    expect(result.current.isHiddenByGroupId).toEqual({
      [hiddenGroupId]: true,
    });
    expect(result.current.isHiddenByGroupId[visibleGroupId]).toBeUndefined();
  });

  it('sources avatarAccountType from the settings selector', () => {
    const { state } = createBaseState();

    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    expect(result.current.avatarAccountType).toBe('JazzIcon');
  });

  it('passes toggles through to useToggleAccountGroupHidden for a visible group', () => {
    const { state, visibleGroupId } = createBaseState();
    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    act(() => {
      result.current.onToggleHidden(visibleGroupId, true);
    });

    expect(mockSetAccountGroupHidden).toHaveBeenCalledTimes(1);
    expect(mockSetAccountGroupHidden).toHaveBeenCalledWith(
      visibleGroupId,
      true,
    );
  });

  it('passes toggles through to useToggleAccountGroupHidden for a hidden group', () => {
    const { state, hiddenGroupId } = createBaseState();
    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    act(() => {
      result.current.onToggleHidden(hiddenGroupId, false);
    });

    expect(mockSetAccountGroupHidden).toHaveBeenCalledTimes(1);
    expect(mockSetAccountGroupHidden).toHaveBeenCalledWith(
      hiddenGroupId,
      false,
    );
  });

  it('does not call syncWithUserStorage when toggling hidden state', () => {
    const { state, visibleGroupId } = createBaseState();
    const mockSyncWithUserStorage = jest.mocked(
      Engine.context.AccountTreeController.syncWithUserStorage,
    );
    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    act(() => {
      result.current.onToggleHidden(visibleGroupId, true);
    });

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
      const group = createMockAccountGroup('entropy:w1/0', 'Group 1');
      const wallet = createMockEntropyWallet('entropy:w1', 'Wallet 1', [group]);

      const { result } = renderHookWithProvider(() => useManageAccountsView(), {
        state: buildVariantState([wallet]),
      });

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
      const group = createMockAccountGroup('keyring:hw/0', 'Ledger 1');
      const hardwareWallet = {
        id: 'keyring:hw',
        type: AccountWalletType.Keyring,
        metadata: {
          name: 'Ledger',
          keyring: { type: ExtendedKeyringTypes.ledger },
        },
        groups: { 'keyring:hw/0': group },
      } as unknown as AccountWalletObject;

      const { result } = renderHookWithProvider(() => useManageAccountsView(), {
        state: buildVariantState([hardwareWallet]),
      });

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
      const group = createMockAccountGroup('keyring:imported/0', 'Imported 1');
      const importedWallet = createMockWallet('keyring:imported', 'Imported', [
        group,
      ]);

      const { result } = renderHookWithProvider(() => useManageAccountsView(), {
        state: buildVariantState([importedWallet]),
      });

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

      const { result } = renderHookWithProvider(() => useManageAccountsView(), {
        state: buildVariantState([snapWallet]),
      });

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
      const state = buildHardwareWalletState(ExtendedKeyringTypes.ledger);

      await triggerHardwareRemoveAlert(state);

      expect(mockRemoveAccountsFromPermissions).toHaveBeenCalledWith([
        expect.anything(),
      ]);
      expect(mockRemoveAccount).toHaveBeenCalledTimes(1);
    });

    it('reselects a remaining account when the removed hardware account is selected', async () => {
      mockSelectedAccount(HARDWARE_ADDRESS);
      mockGetAccounts.mockResolvedValue([REMAINING_ADDRESS]);
      const state = buildHardwareWalletState(ExtendedKeyringTypes.ledger);

      await triggerHardwareRemoveAlert(state);

      expect(mockSetSelectedAddress).toHaveBeenCalledWith(REMAINING_ADDRESS);
    });

    it('does not reselect when the removed hardware account is not selected', async () => {
      mockSelectedAccount(REMAINING_ADDRESS);
      const state = buildHardwareWalletState(ExtendedKeyringTypes.ledger);

      await triggerHardwareRemoveAlert(state);

      expect(mockSetSelectedAddress).not.toHaveBeenCalled();
    });

    it('forgets the Ledger device when the ledger keyring is gone after removal', async () => {
      setKeyrings([]);
      const state = buildHardwareWalletState(ExtendedKeyringTypes.ledger);

      await triggerHardwareRemoveAlert(state);

      expect(forgetLedger).toHaveBeenCalledTimes(1);
    });

    it('forgets the Ledger device when the ledger keyring is empty after removal', async () => {
      setKeyrings([{ type: ExtendedKeyringTypes.ledger, accounts: [] }]);
      const state = buildHardwareWalletState(ExtendedKeyringTypes.ledger);

      await triggerHardwareRemoveAlert(state);

      expect(forgetLedger).toHaveBeenCalledTimes(1);
      expect(forgetQrDevice).not.toHaveBeenCalled();
    });

    it('forgets the QR device when the QR keyring is empty after removal', async () => {
      setKeyrings([{ type: ExtendedKeyringTypes.qr, accounts: [] }]);
      const state = buildHardwareWalletState(ExtendedKeyringTypes.qr);

      await triggerHardwareRemoveAlert(state);

      expect(forgetQrDevice).toHaveBeenCalledTimes(1);
      expect(forgetLedger).not.toHaveBeenCalled();
    });

    it('does not forget the hardware device when other accounts remain on the keyring', async () => {
      setKeyrings([
        {
          type: ExtendedKeyringTypes.ledger,
          accounts: [REMAINING_ADDRESS],
        },
      ]);
      const state = buildHardwareWalletState(ExtendedKeyringTypes.ledger);

      await triggerHardwareRemoveAlert(state);

      expect(forgetLedger).not.toHaveBeenCalled();
      expect(forgetQrDevice).not.toHaveBeenCalled();
    });

    it('navigates to the delete-account sheet for an imported group', () => {
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

      act(() => {
        result.current.onRemoveAccount('keyring:imported/0');
      });

      expect(navigateToDeleteAccount).toHaveBeenCalledTimes(1);
      expect(navigateToDeleteAccount).toHaveBeenCalledWith(internalAccount);
      expect(mockRemoveAccount).not.toHaveBeenCalled();
    });

    it('does nothing when the group cannot be resolved', () => {
      const { state } = createBaseState();
      const navigateToDeleteAccount = jest.fn();
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {
        // No-op
      });
      const { result } = renderHookWithProvider(
        () => useManageAccountsView({ navigateToDeleteAccount }),
        { state },
      );

      act(() => {
        result.current.onRemoveAccount('entropy:unknown/0');
      });

      expect(alertSpy).not.toHaveBeenCalled();
      expect(navigateToDeleteAccount).not.toHaveBeenCalled();
    });

    it('does not allow removing accounts from entropy or hd keyring wallets', () => {
      const { state, visibleGroupId } = createBaseState();
      const navigateToDeleteAccount = jest.fn();
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {
        // No-op
      });
      const { result } = renderHookWithProvider(
        () => useManageAccountsView({ navigateToDeleteAccount }),
        { state },
      );

      // Entropy group
      act(() => {
        result.current.onRemoveAccount('entropy:wallet-2/1' as AccountGroupId);
      });
      expect(alertSpy).not.toHaveBeenCalled();
      expect(navigateToDeleteAccount).not.toHaveBeenCalled();

      // HD keyring group
      act(() => {
        result.current.onRemoveAccount(visibleGroupId);
      });
      expect(alertSpy).not.toHaveBeenCalled();
      expect(navigateToDeleteAccount).not.toHaveBeenCalled();
    });
  });

  it('exposes a stable onAddAccount for the add-account footers', () => {
    const { state } = createBaseState();
    const { result } = renderHookWithProvider(() => useManageAccountsView(), {
      state,
    });

    let firstResult: unknown;
    act(() => {
      firstResult = result.current.onAddAccount('Wallet 1');
    });

    expect(firstResult).toBeUndefined();
    expect(result.current.onAddAccount).toBeDefined();
  });
});
