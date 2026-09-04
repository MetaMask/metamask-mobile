import { act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AccountGroupId, AccountWalletType } from '@metamask/account-api';
import type { AccountWalletObject } from '@metamask/account-tree-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
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

const HARDWARE_ADDRESS = '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756';
const REMAINING_ADDRESS = '0x1234567890123456789012345678901234567890';

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

const buildState = (
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
    state: buildState([wallet1, wallet2]),
    visibleGroupId: 'keyring:wallet-1/1' as AccountGroupId,
    hiddenGroupId: 'keyring:wallet-1/2' as AccountGroupId,
  };
};

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

  return buildState([hardwareWallet], {
    'account-keyring:hw/0': internalAccount,
  });
};

const renderUseManageAccountsView = ({
  state = createBaseState().state,
  navigateToDeleteAccount,
}: {
  state?: RootState;
  navigateToDeleteAccount?: (account: InternalAccount) => void;
} = {}) =>
  renderHookWithProvider(
    () => useManageAccountsView({ navigateToDeleteAccount }),
    { state },
  );

const triggerHardwareRemoveAlert = async (state: RootState) => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {
    // No-op: remove button is invoked explicitly.
  });
  const { result } = renderUseManageAccountsView({ state });

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
    const { state } = createBaseState();

    const { result } = renderUseManageAccountsView({ state });

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

    const { result } = renderUseManageAccountsView({ state });

    expect(
      result.current.sections[0].groups.some(
        (group) => group.id === hiddenGroupId,
      ),
    ).toBe(true);
  });

  it('derives the hidden map from the hidden account group IDs selector', () => {
    const { state, hiddenGroupId, visibleGroupId } = createBaseState();

    const { result } = renderUseManageAccountsView({ state });

    expect(result.current.isHiddenByGroupId).toEqual({
      [hiddenGroupId]: true,
    });
    expect(result.current.isHiddenByGroupId[visibleGroupId]).toBeUndefined();
  });

  it('sources avatarAccountType from the settings selector', () => {
    const { state } = createBaseState();

    const { result } = renderUseManageAccountsView({ state });

    expect(result.current.avatarAccountType).toBe('JazzIcon');
  });

  it.each([
    {
      description: 'a visible group',
      getGroupId: (base: ReturnType<typeof createBaseState>) =>
        base.visibleGroupId,
      nextHidden: true,
    },
    {
      description: 'a hidden group',
      getGroupId: (base: ReturnType<typeof createBaseState>) =>
        base.hiddenGroupId,
      nextHidden: false,
    },
  ])(
    'passes toggles through to useToggleAccountGroupHidden for $description',
    ({ getGroupId, nextHidden }) => {
      const base = createBaseState();
      const groupId = getGroupId(base);
      const { result } = renderUseManageAccountsView({ state: base.state });

      act(() => {
        result.current.onToggleHidden(groupId, nextHidden);
      });

      expect(mockSetAccountGroupHidden).toHaveBeenCalledTimes(1);
      expect(mockSetAccountGroupHidden).toHaveBeenCalledWith(
        groupId,
        nextHidden,
      );
    },
  );

  it('does not call syncWithUserStorage when toggling hidden state', () => {
    const { state, visibleGroupId } = createBaseState();
    const mockSyncWithUserStorage = jest.mocked(
      Engine.context.AccountTreeController.syncWithUserStorage,
    );
    const { result } = renderUseManageAccountsView({ state });

    act(() => {
      result.current.onToggleHidden(visibleGroupId, true);
    });

    expect(mockSyncWithUserStorage).not.toHaveBeenCalled();
  });

  describe('per-section affordances (type → variant / lock / footer)', () => {
    it.each([
      {
        type: 'entropy',
        wallet: createMockEntropyWallet('entropy:w1', 'Wallet 1', [
          createMockAccountGroup('entropy:w1/0', 'Group 1'),
        ]),
        expected: {
          walletId: 'entropy:w1',
          isLocked: true,
          showsAddAccountFooter: true,
          rowVariantByGroupId: {
            'entropy:w1/0': ManageAccountRowVariant.Hide,
          },
        },
      },
      {
        type: 'hardware',
        wallet: {
          id: 'keyring:hw',
          type: AccountWalletType.Keyring,
          metadata: {
            name: 'Ledger',
            keyring: { type: ExtendedKeyringTypes.ledger },
          },
          groups: {
            'keyring:hw/0': createMockAccountGroup('keyring:hw/0', 'Ledger 1'),
          },
        } as unknown as AccountWalletObject,
        expected: {
          walletId: 'keyring:hw',
          isLocked: false,
          showsAddAccountFooter: true,
          rowVariantByGroupId: {
            'keyring:hw/0': ManageAccountRowVariant.HideAndRemove,
          },
        },
      },
      {
        type: 'imported',
        wallet: createMockWallet('keyring:imported', 'Imported', [
          createMockAccountGroup('keyring:imported/0', 'Imported 1'),
        ]),
        expected: {
          walletId: 'keyring:imported',
          isLocked: false,
          showsAddAccountFooter: false,
          rowVariantByGroupId: {
            'keyring:imported/0': ManageAccountRowVariant.Remove,
          },
        },
      },
      {
        type: 'snap',
        wallet: {
          id: 'snap:foo',
          type: AccountWalletType.Snap,
          metadata: {
            name: 'Snap Wallet',
            snap: { id: 'npm:@metamask/snap' },
          },
          groups: {
            'snap:foo/0': createMockAccountGroup('snap:foo/0', 'Snap 1'),
          },
        } as unknown as AccountWalletObject,
        expected: {
          walletId: 'snap:foo',
          isLocked: false,
          showsAddAccountFooter: false,
          rowVariantByGroupId: {
            'snap:foo/0': ManageAccountRowVariant.None,
          },
        },
      },
    ])(
      'maps $type groups to expected variant, footer, and lock state',
      ({ wallet, expected }) => {
        const { result } = renderUseManageAccountsView({
          state: buildState([wallet]),
        });

        expect(result.current.sections[0]).toMatchObject(expected);
      },
    );
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

    it.each([
      {
        description:
          'reselects a remaining account when the removed hardware account is selected',
        selectedAddress: HARDWARE_ADDRESS,
        expectedReselect: REMAINING_ADDRESS,
      },
      {
        description:
          'does not reselect when the removed hardware account is not selected',
        selectedAddress: REMAINING_ADDRESS,
        expectedReselect: null,
      },
    ])('$description', async ({ selectedAddress, expectedReselect }) => {
      mockSelectedAccount(selectedAddress);
      mockGetAccounts.mockResolvedValue([REMAINING_ADDRESS]);
      const state = buildHardwareWalletState(ExtendedKeyringTypes.ledger);

      await triggerHardwareRemoveAlert(state);

      if (expectedReselect) {
        expect(mockSetSelectedAddress).toHaveBeenCalledWith(expectedReselect);
      } else {
        expect(mockSetSelectedAddress).not.toHaveBeenCalled();
      }
    });

    it.each([
      {
        name: 'forgets the Ledger device when the ledger keyring is gone after removal',
        keyringType: ExtendedKeyringTypes.ledger,
        keyrings: [],
        expectedForgetLedger: true,
        expectedForgetQr: false,
      },
      {
        name: 'forgets the Ledger device when the ledger keyring is empty after removal',
        keyringType: ExtendedKeyringTypes.ledger,
        keyrings: [{ type: ExtendedKeyringTypes.ledger, accounts: [] }],
        expectedForgetLedger: true,
        expectedForgetQr: false,
      },
      {
        name: 'forgets the QR device when the QR keyring is empty after removal',
        keyringType: ExtendedKeyringTypes.qr,
        keyrings: [{ type: ExtendedKeyringTypes.qr, accounts: [] }],
        expectedForgetLedger: false,
        expectedForgetQr: true,
      },
      {
        name: 'does not forget the hardware device when other accounts remain on the keyring',
        keyringType: ExtendedKeyringTypes.ledger,
        keyrings: [
          {
            type: ExtendedKeyringTypes.ledger,
            accounts: [REMAINING_ADDRESS],
          },
        ],
        expectedForgetLedger: false,
        expectedForgetQr: false,
      },
    ])(
      '$name',
      async ({
        keyringType,
        keyrings,
        expectedForgetLedger,
        expectedForgetQr,
      }) => {
        setKeyrings(keyrings);
        const state = buildHardwareWalletState(keyringType);

        await triggerHardwareRemoveAlert(state);

        if (expectedForgetLedger) {
          expect(forgetLedger).toHaveBeenCalledTimes(1);
        } else {
          expect(forgetLedger).not.toHaveBeenCalled();
        }

        if (expectedForgetQr) {
          expect(forgetQrDevice).toHaveBeenCalledTimes(1);
        } else {
          expect(forgetQrDevice).not.toHaveBeenCalled();
        }
      },
    );

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
      const state = buildState([importedWallet], {
        'account-keyring:imported/0': internalAccount,
      });
      const navigateToDeleteAccount = jest.fn();
      const { result } = renderUseManageAccountsView({
        state,
        navigateToDeleteAccount,
      });

      act(() => {
        result.current.onRemoveAccount('keyring:imported/0');
      });

      expect(navigateToDeleteAccount).toHaveBeenCalledTimes(1);
      expect(navigateToDeleteAccount).toHaveBeenCalledWith(internalAccount);
      expect(mockRemoveAccount).not.toHaveBeenCalled();
    });

    it.each([
      {
        description: 'the group cannot be resolved',
        getGroupId: () => 'entropy:unknown/0' as AccountGroupId,
      },
      {
        description: 'entropy wallet groups',
        getGroupId: () => 'entropy:wallet-2/1' as AccountGroupId,
      },
      {
        description: 'HD keyring wallet groups',
        getGroupId: (base: ReturnType<typeof createBaseState>) =>
          base.visibleGroupId,
      },
    ])('ignores removal when $description', ({ getGroupId }) => {
      const base = createBaseState();
      const navigateToDeleteAccount = jest.fn();
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {
        // No-op
      });
      const { result } = renderUseManageAccountsView({
        state: base.state,
        navigateToDeleteAccount,
      });

      act(() => {
        result.current.onRemoveAccount(getGroupId(base));
      });

      expect(alertSpy).not.toHaveBeenCalled();
      expect(navigateToDeleteAccount).not.toHaveBeenCalled();
    });
  });

  it('exposes a stable onAddAccount for the add-account footers', () => {
    const { result } = renderUseManageAccountsView();

    let firstResult: unknown;
    act(() => {
      firstResult = result.current.onAddAccount('Wallet 1');
    });

    expect(firstResult).toBeUndefined();
    expect(result.current.onAddAccount).toBeDefined();
  });
});
