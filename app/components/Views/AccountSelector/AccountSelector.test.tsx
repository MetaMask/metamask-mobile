import React from 'react';
import { screen } from '@testing-library/react-native';
import AccountSelector from './AccountSelector';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { AccountListViewSelectorsIDs } from '../../../../e2e/selectors/AccountListView.selectors';
import Routes from '../../../constants/navigation/Routes';
import {
  AccountSelectorParams,
  AccountSelectorProps,
} from './AccountSelector.types';

const mockAccounts = [
  {
    address: '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756',
    balance: '0x0',
    name: 'Account 1',
  },
  {
    address: '0x2B5634C42055806a59e9107ED44D43c426E58258',
    balance: '0x0',
    name: 'Account 2',
  },
];

const mockEnsByAccountAddress = {
  '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756': 'test.eth',
};

jest.mock('../../../components/hooks/useAccounts', () => ({
  useAccounts: jest.fn().mockReturnValue({
    accounts: mockAccounts,
    ensByAccountAddress: mockEnsByAccountAddress,
    isLoading: false,
  }),
}));

jest.mock('../../../core/Engine', () => ({
  setSelectedAddress: jest.fn(),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

const mockRoute: AccountSelectorProps['route'] = {
  params: {
    onSelectAccount: jest.fn((address: string) => address),
    checkBalanceError: (balance: string) => balance,
    privacyMode: false,
  } as AccountSelectorParams,
};

const AccountSelectorWrapper = () => <AccountSelector route={mockRoute} />;

describe('AccountSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const wrapper = renderScreen(
      AccountSelectorWrapper,
      {
        name: Routes.SHEET.ACCOUNT_SELECTOR,
        options: {},
      },
      {},
      mockRoute.params,
    );
    expect(wrapper.toJSON()).toMatchSnapshot();
  });

  it('should display accounts list', () => {
    renderScreen(
      AccountSelectorWrapper,
      {
        name: Routes.SHEET.ACCOUNT_SELECTOR,
      },
      {},
      mockRoute.params,
    );

    const accountsList = screen.getByTestId(
      AccountListViewSelectorsIDs.ACCOUNT_LIST_ID,
    );
    expect(accountsList).toBeDefined();
  });

  it('should display add account button', () => {
    renderScreen(
      AccountSelectorWrapper,
      {
        name: Routes.SHEET.ACCOUNT_SELECTOR,
      },
      {},
      mockRoute.params,
    );

    const addButton = screen.getByTestId(
      AccountListViewSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID,
    );
    expect(addButton).toBeDefined();
  });
});
