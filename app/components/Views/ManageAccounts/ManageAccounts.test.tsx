import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { AccountWalletType } from '@metamask/account-api';
import type { AccountWalletObject } from '@metamask/account-tree-controller';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import Routes from '../../../constants/navigation/Routes';
import { RootState } from '../../../reducers';
import renderWithProvider from '../../../util/test/renderWithProvider';
import {
  createMockAccountGroup,
  createMockInternalAccount,
  createMockState,
  createMockWallet,
} from '../../../component-library/components-temp/MultichainAccounts/test-utils';
import { getManageAccountRowRemoveId } from './ManageAccounts.testIds';
import ManageAccounts from './ManageAccounts';

// `AccountListFooter` reaches into Engine.context at render time; not the
// subject under test.
jest.mock(
  '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList/AccountListFooter',
  () =>
    function AccountListFooterMock() {
      return null;
    },
);

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

const HARDWARE_ADDRESS = '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756';

const buildHardwareState = () => {
  const group = createMockAccountGroup('keyring:hw/0', 'Hardware 1');
  const hardwareWallet = {
    id: 'keyring:hw',
    type: AccountWalletType.Keyring,
    metadata: {
      name: 'Hardware',
      keyring: { type: ExtendedKeyringTypes.ledger },
    },
    groups: { 'keyring:hw/0': group },
  } as unknown as AccountWalletObject;
  const internalAccount = createMockInternalAccount(
    'account-keyring:hw/0',
    HARDWARE_ADDRESS,
    'Hardware 1',
  );
  internalAccount.metadata.keyring.type = ExtendedKeyringTypes.ledger;

  return {
    state: {
      ...createMockState([hardwareWallet], {
        'account-keyring:hw/0': internalAccount,
      }),
      settings: { avatarAccountType: 'JazzIcon' },
    } as unknown as RootState,
  };
};

const buildImportedState = () => {
  const group = createMockAccountGroup('keyring:imported/0', 'Imported 1');
  const importedWallet = createMockWallet('keyring:imported', 'Imported', [
    group,
  ]);
  const internalAccount = createMockInternalAccount(
    'account-keyring:imported/0',
    '0xdef',
    'Imported 1',
  );
  internalAccount.metadata.keyring.type = ExtendedKeyringTypes.simple;

  return {
    state: {
      ...createMockState([importedWallet], {
        'account-keyring:imported/0': internalAccount,
      }),
      settings: { avatarAccountType: 'JazzIcon' },
    } as unknown as RootState,
  };
};

const renderManageAccounts = (state: RootState) =>
  renderWithProvider(<ManageAccounts />, { state });

describe('ManageAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hardware account removal', () => {
    it('navigates via the parent modal navigator so the confirmation sheet opens', () => {
      const { state } = buildHardwareState();
      const { getByTestId } = renderManageAccounts(state);

      act(() => {
        fireEvent.press(
          getByTestId(getManageAccountRowRemoveId('keyring:hw/0')),
        );
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
        {
          screen:
            Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REMOVE_HARDWARE_ACCOUNT,
          params: {
            account: expect.objectContaining({ address: HARDWARE_ADDRESS }),
            accountGroup: expect.objectContaining({ id: 'keyring:hw/0' }),
          },
        },
      );
    });
  });

  describe('imported account removal', () => {
    it('navigates via the parent modal navigator to the delete-account sheet', () => {
      const { state } = buildImportedState();
      const { getByTestId } = renderManageAccounts(state);

      act(() => {
        fireEvent.press(
          getByTestId(getManageAccountRowRemoveId('keyring:imported/0')),
        );
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
        {
          screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT,
          params: {
            account: expect.objectContaining({ address: '0xdef' }),
          },
        },
      );
    });
  });
});
