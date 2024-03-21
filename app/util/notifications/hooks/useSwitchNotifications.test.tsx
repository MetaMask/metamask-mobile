/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
/* eslint-disable import/no-namespace */
import createMockStore from 'redux-mock-store';
import { act, renderHook } from '@testing-library/react-hooks';
import { toChecksumAddress } from '@ethereumjs/util';
import React from 'react';
import { Provider } from 'react-redux';
import { updateAccountState } from '../../../core/redux/slices/notifications';
import {
  useAccountSettingsProps,
  useSwitchNotifications,
} from './useSwitchNotifications';
import * as Actions from '../../../actions/notification/helpers';
import initialRootState from '../../test/initial-root-state';
import * as Selectors from '../../../selectors/notifications';
import { Account } from '../../../components/hooks/useAccounts/useAccounts.types';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { Hex } from '@metamask/utils';
import { KeyringTypes } from '@metamask/keyring-controller';
import Engine from '../../../core/Engine';

jest.mock('../../../core/Engine', () => ({
  context: {
    NotificationServicesController: {
      checkAccountsPresence: jest.fn(),
    },
  },
}));

function arrangeStore() {
  const store = createMockStore()(initialRootState);

  // Ensure dispatch mocks are handled correctly
  store.dispatch = jest.fn().mockImplementation((action) => {
    if (typeof action === 'function') {
      return action(store.dispatch, store.getState);
    }
    return Promise.resolve();
  });

  return store;
}

describe('useSwitchNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrangeHook = () => {
    const store = arrangeStore();
    const hook = renderHook(() => useSwitchNotifications(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return { hook, store };
  };

  it('switchs feature announcements', async () => {
    const mockSetFeatureAnnouncementEnabled = jest
      .spyOn(Actions, 'setFeatureAnnouncementsEnabled')
      .mockImplementation(jest.fn());

    const { hook } = arrangeHook();
    const { switchFeatureAnnouncements } = hook.result.current;

    await act(async () => {
      await switchFeatureAnnouncements(true);
    });

    expect(mockSetFeatureAnnouncementEnabled).toHaveBeenCalledWith(true);
    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.error).toBeNull();
  });

  it('switchs account notifications', async () => {
    const mockUpdateOnChainTriggersByAccount = jest
      .spyOn(Actions, 'updateOnChainTriggersByAccount')
      .mockImplementation(jest.fn());
    const mockDeleteOnChainTriggersByAccount = jest
      .spyOn(Actions, 'deleteOnChainTriggersByAccount')
      .mockImplementation(jest.fn());

    const { hook } = arrangeHook();
    const { switchAccountNotifications } = hook.result.current;

    const accounts = ['account1', 'account2'];
    const state = true;

    await act(async () => {
      await switchAccountNotifications(accounts, state);
    });

    expect(mockUpdateOnChainTriggersByAccount).toHaveBeenCalledWith(accounts);
    expect(mockDeleteOnChainTriggersByAccount).not.toHaveBeenCalled();
    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.error).toBeNull();
  });

  it('deletes account notifications', async () => {
    const mockUpdateOnChainTriggersByAccount = jest
      .spyOn(Actions, 'updateOnChainTriggersByAccount')
      .mockImplementation(jest.fn());
    const mockDeleteOnChainTriggersByAccount = jest
      .spyOn(Actions, 'deleteOnChainTriggersByAccount')
      .mockImplementation(jest.fn());

    const { hook } = arrangeHook();
    const { switchAccountNotifications } = hook.result.current;

    const accounts = ['account1', 'account2'];
    const state = false;

    await act(async () => {
      await switchAccountNotifications(accounts, state);
    });

    expect(mockDeleteOnChainTriggersByAccount).toHaveBeenCalledWith(accounts);
    expect(mockUpdateOnChainTriggersByAccount).not.toHaveBeenCalled();
    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.error).toBeNull();
  });
});

describe('useAccountSettingsProps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const MOCK_ACCOUNT_ADDRESSES = Object.values(
    MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
  ).map((account) => account.address);

  const MOCK_ACCOUNT_1: Account = {
    name: 'Account 1',
    address: toChecksumAddress(MOCK_ACCOUNT_ADDRESSES[0]) as Hex,
    type: KeyringTypes.hd,
    yOffset: 0,
    isSelected: false,
    assets: {
      fiatBalance: '\n0 ETH',
    },
    balanceError: undefined,
  };
  const MOCK_ACCOUNT_2: Account = {
    name: 'Account 2',
    address: toChecksumAddress(MOCK_ACCOUNT_ADDRESSES[1]) as Hex,
    type: KeyringTypes.hd,
    yOffset: 78,
    isSelected: true,
    assets: {
      fiatBalance: '\n< 0.00001 ETH',
    },
    balanceError: undefined,
  };

  const MOCK_ACCOUNTS = [MOCK_ACCOUNT_1, MOCK_ACCOUNT_2];

  function arrangeHook(accounts: Account[]) {
    const store = arrangeStore();
    const hook = renderHook(() => useAccountSettingsProps(accounts), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return { hook, store };
  }

  function arrangeSelectors() {
    const selectIsUpdatingMetamaskNotificationsAccount = jest
      .spyOn(Selectors, 'selectIsUpdatingMetamaskNotificationsAccount')
      .mockReturnValue([MOCK_ACCOUNTS[0].address]);

      const isMetamaskNotificationsEnabled = jest
      .spyOn(Selectors,
        'selectIsMetamaskNotificationsEnabled',
      )
      .mockReturnValue(true);

    return {
      selectIsUpdatingMetamaskNotificationsAccount,
      isMetamaskNotificationsEnabled
    };
  }

  it('dispatches updateAccountState with the result of checkAccountsPresence', async () => {
    const mockSelectors = arrangeSelectors();
    const mockCheckAccountsPresence = jest.fn().mockResolvedValue({
      [MOCK_ACCOUNTS[0].address]: true,
      [MOCK_ACCOUNTS[1].address]: false,
    });

    Engine.context.NotificationServicesController.checkAccountsPresence = mockCheckAccountsPresence;

    mockSelectors.selectIsUpdatingMetamaskNotificationsAccount.mockReturnValue([]);
    mockSelectors.isMetamaskNotificationsEnabled.mockReturnValue(true);

    const { hook, store } = arrangeHook(MOCK_ACCOUNTS);

    await act(async () => {
      await hook.result.current.updateAndfetchAccountSettings();
    });

    expect(mockCheckAccountsPresence).toHaveBeenCalledWith(MOCK_ACCOUNTS.map(account => account.address));

    expect(store.dispatch).toHaveBeenCalledWith(
      updateAccountState({
        [MOCK_ACCOUNTS[0].address]: true,
        [MOCK_ACCOUNTS[1].address]: false,
      })
    );
  });
});
