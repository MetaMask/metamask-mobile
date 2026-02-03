import React from 'react';
import { render } from '@testing-library/react-native';
import AccountsMenu from './AccountsMenu';
import { AccountsMenuSelectorsIDs } from './AccountsMenu.testIds';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        default: '#FFFFFF',
        alternative: '#F2F4F6',
      },
      text: {
        default: '#24272A',
        alternative: '#6A737D',
      },
    },
  }),
}));

describe('AccountsMenu', () => {
  it('should render correctly', () => {
    const { getByTestId } = render(<AccountsMenu />);

    expect(
      getByTestId(AccountsMenuSelectorsIDs.ACCOUNTS_MENU_HEADER),
    ).toBeDefined();
    expect(
      getByTestId(AccountsMenuSelectorsIDs.ACCOUNTS_MENU_SCROLL_ID),
    ).toBeDefined();
  });

  it('should render Quick Actions section', () => {
    const { getByText } = render(<AccountsMenu />);

    expect(getByText('Quick Actions (Deposit, Earn, Scan)')).toBeDefined();
  });

  it('should render MANAGE section header', () => {
    const { getByText } = render(<AccountsMenu />);

    expect(getByText('MANAGE')).toBeDefined();
  });

  it('should render RESOURCES section header', () => {
    const { getByText } = render(<AccountsMenu />);

    expect(getByText('RESOURCES')).toBeDefined();
  });
});
