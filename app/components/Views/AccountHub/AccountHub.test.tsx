import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import AccountHub from './AccountHub';
import { AccountHubSelectorsIDs } from './AccountHub.testIds';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectAvatarAccountType } from '../../../selectors/settings';
import {
  getMetamaskNotificationsUnreadCount,
  selectIsMetamaskNotificationsEnabled,
} from '../../../selectors/notifications';
import { useAccountsOperationsLoadingStates } from '../../../util/accounts/useAccountsOperationsLoadingStates';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockOpenQRScanner = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));

jest.mock('../../hooks/useQRScanner', () => ({
  useQRScanner: () => ({ openQRScanner: mockOpenQRScanner }),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({ name: 'test-event' })),
    })),
  }),
}));

jest.mock('../../../util/accounts/useAccountsOperationsLoadingStates', () => ({
  useAccountsOperationsLoadingStates: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    AccountTreeController: { setSelectedAccountGroup: jest.fn() },
  },
}));

// The account list pulls a large selector graph that is orthogonal to this
// screen's wiring; the screen only needs to pass it the right props.
jest.mock(
  '../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: (props: Record<string, unknown>) => (
        <View testID={props.testID as string} {...{ accessible: false }} />
      ),
    };
  },
);

const SELECTED_ACCOUNT = { address: '0xabc123' };
const SELECTED_GROUP = { id: 'group-1', metadata: { name: 'DeFi Account' } };

// `accountGroup` takes `null` for the no-selection case — passing `undefined`
// would fall back to the destructuring default.
const arrangeSelectors = ({
  accountGroup = SELECTED_GROUP,
  unreadCount = 0,
}: { accountGroup?: unknown; unreadCount?: number } = {}) => {
  jest.mocked(useSelector).mockImplementation((selector: unknown) => {
    if (selector === selectSelectedInternalAccount) return SELECTED_ACCOUNT;
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

  it('opens notifications from the bell', () => {
    const { getByTestId } = render(<AccountHub />);

    fireEvent.press(getByTestId(AccountHubSelectorsIDs.NOTIFICATIONS_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.NOTIFICATIONS.VIEW);
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

  it('does not navigate from Info when no account group is selected', () => {
    arrangeSelectors({ accountGroup: null });

    const { getByTestId } = render(<AccountHub />);
    fireEvent.press(getByTestId(AccountHubSelectorsIDs.INFO_BUTTON));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('selects an account group and dismisses', () => {
    const { UNSAFE_getByType } = render(<AccountHub />);
    const list = UNSAFE_getByType(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList')
        .default,
    );

    list.props.onSelectAccount({ id: 'group-2' });

    expect(
      Engine.context.AccountTreeController.setSelectedAccountGroup,
    ).toHaveBeenCalledWith('group-2');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('hides search in the reused account list', () => {
    const { UNSAFE_getByType } = render(<AccountHub />);
    const list = UNSAFE_getByType(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../../component-library/components-temp/MultichainAccounts/MultichainAccountSelectorList')
        .default,
    );

    expect(list.props.hideSearch).toBe(true);
  });
});
