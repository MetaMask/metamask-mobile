import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { AccountWalletType } from '@metamask/account-api';
import type { AccountWalletObject } from '@metamask/account-tree-controller';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import Routes from '../../../constants/navigation/Routes';
import { RootState } from '../../../reducers';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { createMockUseAnalyticsHook } from '../../../util/test/analyticsMock';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import { ManageAccountsViewedSource } from '../../../core/Analytics/events/accounts';
import {
  createMockAccountGroup,
  createMockHiddenAccountGroup,
  createMockInternalAccount,
  createMockState,
  createMockWallet,
} from '../../../component-library/components-temp/MultichainAccounts/test-utils';
import {
  getManageAccountRowRemoveId,
  getManageAccountRowEyeToggleId,
} from './ManageAccounts.testIds';
import type { ManageAccountsParams } from './ManageAccounts.types';
import ManageAccounts from './ManageAccounts';
import Engine from '../../../core/Engine';

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
let mockRouteParams: ManageAccountsParams | undefined;
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics');
const mockTrackEvent = jest.fn();

jest.mock('../../../core/Engine', () => ({
  context: {
    AccountTreeController: {
      setAccountGroupHidden: jest.fn(),
    },
  },
}));

const mockSetAccountGroupHidden = jest.mocked(
  Engine.context.AccountTreeController.setAccountGroupHidden,
);

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

// Two wallets holding three account groups, one of them hidden — enough for
// each of the event's counts to come out at a different number.
const buildMixedState = () => {
  const entropyWallet = createMockWallet('keyring:srp', 'SRP', [
    createMockAccountGroup('keyring:srp/0', 'Account 1'),
    createMockHiddenAccountGroup('keyring:srp/1', 'Account 2'),
  ]);
  const importedWallet = createMockWallet('keyring:imported', 'Imported', [
    createMockAccountGroup('keyring:imported/0', 'Imported 1'),
  ]);

  return {
    state: {
      ...createMockState([entropyWallet, importedWallet], {
        'account-keyring:srp/0': createMockInternalAccount(
          'account-keyring:srp/0',
          '0xaaa',
          'Account 1',
        ),
        'account-keyring:srp/1': createMockInternalAccount(
          'account-keyring:srp/1',
          '0xbbb',
          'Account 2',
        ),
        'account-keyring:imported/0': createMockInternalAccount(
          'account-keyring:imported/0',
          '0xccc',
          'Imported 1',
        ),
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
    mockRouteParams = undefined;
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
      }),
    );
  });

  describe('hardware account rows', () => {
    it('renders a hide toggle and no remove control (hardware is hideable, not removable)', () => {
      const { state } = buildHardwareState();
      const { getByTestId, queryByTestId } = renderManageAccounts(state);

      expect(
        getByTestId(getManageAccountRowEyeToggleId('keyring:hw/0')),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(getManageAccountRowRemoveId('keyring:hw/0')),
      ).toBeNull();
    });

    it('hides the hardware account instead of opening a remove sheet', () => {
      const { state } = buildHardwareState();
      const { getByTestId } = renderManageAccounts(state);

      act(() => {
        fireEvent.press(
          getByTestId(getManageAccountRowEyeToggleId('keyring:hw/0')),
        );
      });

      expect(mockSetAccountGroupHidden).toHaveBeenCalledWith(
        'keyring:hw/0',
        true,
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('imported account removal', () => {
    it('navigates via the parent modal navigator to the same remove-account sheet', () => {
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
          screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REMOVE_ACCOUNT,
          params: {
            account: expect.objectContaining({ address: '0xdef' }),
            accountGroup: expect.objectContaining({
              id: 'keyring:imported/0',
            }),
          },
        },
      );
    });
  });

  describe('Manage Accounts Viewed', () => {
    const manageAccountsViewedCalls = () =>
      mockTrackEvent.mock.calls.filter(
        ([event]) => event.name === EVENT_NAME.MANAGE_ACCOUNTS_VIEWED,
      );

    it('tracks the view with the account, wallet and hidden totals', () => {
      const { state } = buildMixedState();

      renderManageAccounts(state);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: EVENT_NAME.MANAGE_ACCOUNTS_VIEWED,
          properties: {
            source: ManageAccountsViewedSource.AccountList,
            total_accounts: 3,
            total_wallets: 2,
            hidden_count: 1,
          },
        }),
      );
    });

    it('counts hidden accounts within the total rather than alongside it', () => {
      const { state } = buildMixedState();

      renderManageAccounts(state);

      const [[event]] = manageAccountsViewedCalls();
      const { total_accounts: total, hidden_count: hidden } = event.properties;
      expect(hidden).toBeLessThan(total);
    });

    it('defaults the source to the account list when a caller omits it', () => {
      const { state } = buildHardwareState();
      mockRouteParams = undefined;

      renderManageAccounts(state);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            source: ManageAccountsViewedSource.AccountList,
          }),
        }),
      );
    });

    it('reports the source the caller navigated with', () => {
      const { state } = buildHardwareState();
      mockRouteParams = { source: ManageAccountsViewedSource.AccountMenu };

      renderManageAccounts(state);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            source: ManageAccountsViewedSource.AccountMenu,
          }),
        }),
      );
    });

    it('fires once per open, not again when hiding an account re-renders the screen', () => {
      const { state } = buildHardwareState();
      const { getByTestId } = renderManageAccounts(state);

      act(() => {
        fireEvent.press(
          getByTestId(getManageAccountRowEyeToggleId('keyring:hw/0')),
        );
      });

      expect(manageAccountsViewedCalls()).toHaveLength(1);
    });
  });
});
