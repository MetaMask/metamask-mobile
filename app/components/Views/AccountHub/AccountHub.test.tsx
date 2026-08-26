import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import AccountHub from './AccountHub';
import MultichainAccountSelectorList from '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList';
import { AccountHubSelectorsIDs } from './AccountHub.testIds';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  selectInternalAccounts,
  selectSelectedInternalAccount,
} from '../../../selectors/accountsController';
import { useSyncSRPs } from '../../hooks/useSyncSRPs';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectAvatarAccountType } from '../../../selectors/settings';
import {
  getMetamaskNotificationsReadCount,
  getMetamaskNotificationsUnreadCount,
  selectIsMetamaskNotificationsEnabled,
} from '../../../selectors/notifications';
import { useAccountsOperationsLoadingStates } from '../../../util/accounts/useAccountsOperationsLoadingStates';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockOpenQRScanner = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: jest.fn(() => ({ name: 'test-event' })),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));

jest.mock('../../hooks/useQRScanner', () => ({
  useQRScanner: () => ({ openQRScanner: mockOpenQRScanner }),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../hooks/useSyncSRPs', () => ({
  useSyncSRPs: jest.fn(() => ({ loading: false })),
}));

jest.mock('../../../util/accounts/useAccountsOperationsLoadingStates', () => ({
  useAccountsOperationsLoadingStates: jest.fn(),
}));

jest.mock('../../../util/notifications', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    AccountTreeController: { setSelectedAccountGroup: jest.fn() },
  },
}));

jest.mock(
  '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: (props: Record<string, unknown>) => (
        <View testID={props.testID as string} accessible={false}>
          {props.ListHeaderComponent as React.ReactNode}
          {props.ListFooterComponent as React.ReactNode}
        </View>
      ),
    };
  },
);

const SELECTED_ACCOUNT = { address: '0xabc123' };
const SELECTED_GROUP = { id: 'group-1', metadata: { name: 'DeFi Account' } };
const INTERNAL_ACCOUNTS = [{ id: 'account-1' }, { id: 'account-2' }];

const arrangeSelectors = ({
  accountGroup = SELECTED_GROUP,
  unreadCount = 0,
  readCount = 3,
}: {
  accountGroup?: unknown;
  unreadCount?: number;
  readCount?: number;
} = {}) => {
  jest.mocked(useSelector).mockImplementation((selector: unknown) => {
    if (selector === selectSelectedInternalAccount) return SELECTED_ACCOUNT;
    if (selector === selectInternalAccounts) return INTERNAL_ACCOUNTS;
    if (selector === getMetamaskNotificationsReadCount) return readCount;
    if (selector === selectSelectedAccountGroup) return accountGroup;
    if (selector === selectAvatarAccountType) return 'JazzIcon';
    if (selector === selectIsMetamaskNotificationsEnabled) return true;
    if (selector === getMetamaskNotificationsUnreadCount) return unreadCount;
    return undefined;
  });
};

describe('AccountHub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(true);
    jest.mocked(useAccountsOperationsLoadingStates).mockReturnValue({
      isAccountSyncingInProgress: false,
      loadingMessage: undefined,
    } as unknown as ReturnType<typeof useAccountsOperationsLoadingStates>);
    arrangeSelectors();
  });

  it('renders the selected account name and the three action buttons', () => {
    const { getByTestId } = render(<AccountHub />);

    expect(getByTestId(AccountHubSelectorsIDs.ACCOUNT_NAME)).toHaveTextContent(
      'DeFi Account',
    );
    expect(getByTestId(AccountHubSelectorsIDs.INFO_BUTTON)).toBeOnTheScreen();
    expect(getByTestId(AccountHubSelectorsIDs.SCAN_BUTTON)).toBeOnTheScreen();
    expect(
      getByTestId(AccountHubSelectorsIDs.ACTIVITY_BUTTON),
    ).toBeOnTheScreen();
    expect(getByTestId(AccountHubSelectorsIDs.ACCOUNT_LIST)).toBeOnTheScreen();
  });

  it('navigates back from the header back button', () => {
    const { getByTestId } = render(<AccountHub />);

    fireEvent.press(getByTestId(AccountHubSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows the unread dot on the bell when there are unread notifications', () => {
    arrangeSelectors({ unreadCount: 2 });

    const { getByTestId } = render(<AccountHub />);

    expect(
      getByTestId(AccountHubSelectorsIDs.NOTIFICATIONS_BADGE),
    ).toBeOnTheScreen();
  });

  it('hides the unread dot when there are no unread notifications', () => {
    arrangeSelectors({ unreadCount: 0 });

    const { queryByTestId } = render(<AccountHub />);

    expect(
      queryByTestId(AccountHubSelectorsIDs.NOTIFICATIONS_BADGE),
    ).not.toBeOnTheScreen();
  });

  it('hides the bell entirely when the notifications feature is disabled', () => {
    jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(false);

    const { queryByTestId } = render(<AccountHub />);

    expect(
      queryByTestId(AccountHubSelectorsIDs.NOTIFICATIONS_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(AccountHubSelectorsIDs.NOTIFICATIONS_BADGE),
    ).not.toBeOnTheScreen();
  });

  it('opens notifications from the bell', () => {
    arrangeSelectors({ unreadCount: 2, readCount: 5 });

    const { getByTestId } = render(<AccountHub />);

    fireEvent.press(getByTestId(AccountHubSelectorsIDs.NOTIFICATIONS_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.NOTIFICATIONS.VIEW);
    expect(mockAddProperties).toHaveBeenCalledWith({
      unread_count: 2,
      read_count: 5,
    });
  });

  it('opens the settings flow from the hamburger', () => {
    const { getByTestId } = render(<AccountHub />);

    fireEvent.press(getByTestId(AccountHubSelectorsIDs.MENU_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW);
  });

  it('opens account group details from Info', () => {
    const { getByTestId } = render(<AccountHub />);

    fireEvent.press(getByTestId(AccountHubSelectorsIDs.INFO_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_GROUP_DETAILS,
      { accountGroup: SELECTED_GROUP },
    );
  });

  it('opens the QR scanner from Scan', () => {
    const { getByTestId } = render(<AccountHub />);

    fireEvent.press(getByTestId(AccountHubSelectorsIDs.SCAN_BUTTON));

    expect(mockOpenQRScanner).toHaveBeenCalled();
  });

  it('opens the activity screen from Activity', () => {
    const { getByTestId } = render(<AccountHub />);

    fireEvent.press(getByTestId(AccountHubSelectorsIDs.ACTIVITY_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
    });
  });

  it('opens the add-wallet sheet', () => {
    const { getByTestId } = render(<AccountHub />);

    fireEvent.press(getByTestId(AccountHubSelectorsIDs.ADD_WALLET_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SHEET.ADD_WALLET);
  });

  it('hides the account list when no account group is selected', () => {
    arrangeSelectors({ accountGroup: null });

    const { queryByTestId } = render(<AccountHub />);

    expect(
      queryByTestId(AccountHubSelectorsIDs.ACCOUNT_LIST),
    ).not.toBeOnTheScreen();
  });

  it('disables Info when no account group is selected', () => {
    arrangeSelectors({ accountGroup: null });

    const { getByTestId } = render(<AccountHub />);
    const infoButton = getByTestId(AccountHubSelectorsIDs.INFO_BUTTON);
    fireEvent.press(infoButton);

    expect(infoButton).toBeDisabled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('selects an account group and dismisses', () => {
    const { UNSAFE_getByType } = render(<AccountHub />);
    const list = UNSAFE_getByType(MultichainAccountSelectorList);

    list.props.onSelectAccount({ id: 'group-2' });

    expect(
      Engine.context.AccountTreeController.setSelectedAccountGroup,
    ).toHaveBeenCalledWith('group-2');
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SWITCHED_ACCOUNT,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      source: 'Account Hub',
      number_of_accounts: INTERNAL_ACCOUNTS.length,
    });
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('syncs SRPs while the hub is open', () => {
    render(<AccountHub />);

    expect(useSyncSRPs).toHaveBeenCalled();
  });

  it('scrolls the header with the list and pins Add wallet below it', () => {
    const { UNSAFE_getByType, getByTestId } = render(<AccountHub />);
    const list = UNSAFE_getByType(MultichainAccountSelectorList);

    expect(list.props.ListHeaderComponent).toBeTruthy();
    // Add wallet is a sibling below the list (sticky), not a list footer.
    expect(list.props.ListFooterComponent).toBeUndefined();
    expect(
      getByTestId(AccountHubSelectorsIDs.ADD_WALLET_BUTTON),
    ).toBeOnTheScreen();
  });

  it('hides search in the reused account list', () => {
    const { UNSAFE_getByType } = render(<AccountHub />);
    const list = UNSAFE_getByType(MultichainAccountSelectorList);

    expect(list.props.hideSearch).toBe(true);
  });
});
