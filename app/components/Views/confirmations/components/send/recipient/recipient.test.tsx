import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { Recipient } from './recipient';
import { RecipientType } from '../../UI/recipient';
import { useContacts } from '../../../hooks/send/useContacts';

const mockUpdateTo = jest.fn();
const mockHandleSubmitPress = jest.fn();

const mockAccounts: RecipientType[] = [
  {
    name: 'Account 1',
    address: '0x1234567890123456789012345678901234567890',
    fiatValue: '$1,000.00',
  },
  {
    name: 'Account 2',
    address: '0x0987654321098765432109876543210987654321',
    fiatValue: '$500.00',
  },
];

const mockContacts: RecipientType[] = [
  {
    name: 'John Doe',
    address: '0x1111111111111111111111111111111111111111',
    fiatValue: '$2,000.00',
  },
];

jest.mock('../../../hooks/send/useSendNavbar', () => ({
  useSendNavbar: jest.fn(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'send.accounts': 'Your Accounts',
      'send.contacts': 'Contacts',
      'send.no_contacts_found': 'No contacts found',
      'send.review': 'Review',
    };
    return mockStrings[key] || key;
  }),
}));

jest.mock('../../../context/send-context/send-context', () => ({
  useSendContext: jest.fn(() => ({
    updateTo: mockUpdateTo,
  })),
}));

jest.mock('../../../hooks/send/useSendActions', () => ({
  useSendActions: jest.fn(() => ({
    handleSubmitPress: mockHandleSubmitPress,
  })),
}));

jest.mock('../../../hooks/send/useAccounts', () => ({
  useAccounts: jest.fn(() => mockAccounts),
}));

jest.mock('../../../hooks/send/useContacts');

jest.mock('../../../hooks/send/useToAddressValidation', () => ({
  useToAddressValidation: jest.fn((address: string) => ({
    toAddressError: address === 'invalid' ? 'Invalid address' : null,
  })),
}));

jest.mock('./recipient.styles', () => ({
  styleSheet: jest.fn(() => ({
    container: { flex: 1 },
  })),
}));

jest.mock('../../recipient-list/recipient-list', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RecipientList: ({ data, onRecipientSelected, emptyMessage }: any) => {
    const { Text, Pressable, View } = jest.requireActual('react-native');

    if (!data || data.length === 0) {
      return emptyMessage ? (
        <Text testID="empty-message">{emptyMessage}</Text>
      ) : null;
    }

    const listType = data === mockAccounts ? 'accounts' : 'contacts';

    return (
      <View testID={`recipient-list-${listType}`}>
        {data.map((recipient: RecipientType) => (
          <Pressable
            key={recipient.address}
            testID={`recipient-item-${recipient.address}`}
            onPress={() => onRecipientSelected(recipient)}
          >
            <Text>{recipient.name}</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));

jest.mock('../../recipient-input', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RecipientInput: ({ value, onChangeText }: any) => {
    const { TextInput } = jest.requireActual('react-native');
    return (
      <TextInput
        testID="recipient-input"
        value={value}
        onChangeText={onChangeText}
        placeholder="Enter address"
      />
    );
  },
}));

jest.mock('react-native-scrollable-tab-view', () => {
  const { View } = jest.requireActual('react-native');
  const ActualReact = jest.requireActual('react');
  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ children, renderTabBar }: any) => {
      // Extract tab labels from children
      const tabs =
        ActualReact.Children.map(children, (child: React.ReactElement) => ({
          label: child.props.tabLabel,
        })) || [];

      const TabBarComponent = renderTabBar();
      const TabBarWithTabs = ActualReact.cloneElement(TabBarComponent, {
        tabs,
      });

      return (
        <View testID="scrollable-tab-view">
          {TabBarWithTabs}
          {children}
        </View>
      );
    },
  };
});

jest.mock(
  '../../../../../../component-library/components-temp/TabBar/TabBar',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default: ({ tabs = [] }: any) => (
        <View testID="tab-bar">
          {tabs.map((tab: { label: string }, index: number) => (
            <Text key={index}>{tab.label}</Text>
          ))}
        </View>
      ),
    };
  },
);

describe('Recipient', () => {
  const mockUseContacts = jest.mocked(useContacts);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContacts.mockReturnValue(mockContacts);
  });

  it('renders recipient input correctly', () => {
    const { getByTestId } = renderWithProvider(<Recipient />);

    expect(getByTestId('recipient-input')).toBeOnTheScreen();
  });

  it('displays tabs when address input is empty', () => {
    const { getByTestId, getByText } = renderWithProvider(<Recipient />);

    expect(getByTestId('scrollable-tab-view')).toBeOnTheScreen();
    expect(getByText('Your Accounts')).toBeOnTheScreen();
    expect(getByText('Contacts')).toBeOnTheScreen();
  });

  it('displays account list in accounts tab', () => {
    const { getByTestId, getByText } = renderWithProvider(<Recipient />);

    expect(getByTestId('recipient-list-accounts')).toBeOnTheScreen();
    expect(getByText('Account 1')).toBeOnTheScreen();
    expect(getByText('Account 2')).toBeOnTheScreen();
  });

  it('displays contacts list in contacts tab', () => {
    const { getByText } = renderWithProvider(<Recipient />);

    expect(getByText('John Doe')).toBeOnTheScreen();
  });

  it('displays empty message when no contacts found', () => {
    mockUseContacts.mockReturnValue([]);

    const { getByTestId } = renderWithProvider(<Recipient />);

    expect(getByTestId('empty-message')).toBeOnTheScreen();
  });

  it('hides tabs when address input has content', () => {
    const { getByTestId, queryByTestId, rerender } = renderWithProvider(
      <Recipient />,
    );

    expect(queryByTestId('scrollable-tab-view')).toBeOnTheScreen();

    fireEvent.changeText(getByTestId('recipient-input'), '0x123');

    rerender(<Recipient />);

    expect(queryByTestId('scrollable-tab-view')).not.toBeOnTheScreen();
  });

  it('shows review button when address input has content', () => {
    const { getByTestId, getByText } = renderWithProvider(<Recipient />);

    fireEvent.changeText(
      getByTestId('recipient-input'),
      '0x1234567890123456789012345678901234567890',
    );

    expect(getByText('Review')).toBeOnTheScreen();
  });

  it('enables review button for valid address', () => {
    const { getByTestId, getByText } = renderWithProvider(<Recipient />);

    fireEvent.changeText(
      getByTestId('recipient-input'),
      '0x1234567890123456789012345678901234567890',
    );

    const reviewButton = getByText('Review');
    expect(reviewButton).toBeOnTheScreen();

    fireEvent.press(reviewButton);
    expect(mockHandleSubmitPress).toHaveBeenCalled();
  });

  it('disables review button for invalid address', () => {
    const { getByTestId, getByText } = renderWithProvider(<Recipient />);

    fireEvent.changeText(getByTestId('recipient-input'), 'invalid');

    const reviewButton = getByText('Review');
    expect(reviewButton).toBeOnTheScreen();

    mockHandleSubmitPress.mockClear();

    fireEvent.press(reviewButton);
    expect(mockHandleSubmitPress).not.toHaveBeenCalled();
  });

  it('calls updateTo and handleSubmitPress when review button is pressed with valid address', () => {
    const { getByTestId, getByText } = renderWithProvider(<Recipient />);
    const validAddress = '0x1234567890123456789012345678901234567890';

    fireEvent.changeText(getByTestId('recipient-input'), validAddress);
    fireEvent.press(getByText('Review'));

    expect(mockUpdateTo).toHaveBeenCalledWith(validAddress);
    expect(mockHandleSubmitPress).toHaveBeenCalledWith(validAddress);
  });

  it('does not call handlers when review button is pressed with invalid address', () => {
    const { getByTestId, getByText } = renderWithProvider(<Recipient />);

    fireEvent.changeText(getByTestId('recipient-input'), 'invalid');
    fireEvent.press(getByText('Review'));

    expect(mockUpdateTo).not.toHaveBeenCalled();
    expect(mockHandleSubmitPress).not.toHaveBeenCalled();
  });

  it('calls updateTo and handleSubmitPress when account is selected from list', () => {
    const { getByTestId } = renderWithProvider(<Recipient />);
    const selectedAccount = mockAccounts[0];

    fireEvent.press(getByTestId(`recipient-item-${selectedAccount.address}`));

    expect(mockUpdateTo).toHaveBeenCalledWith(selectedAccount.address);
    expect(mockHandleSubmitPress).toHaveBeenCalledWith(selectedAccount.address);
  });

  it('calls updateTo and handleSubmitPress when contact is selected from list', () => {
    const { getByTestId } = renderWithProvider(<Recipient />);
    const selectedContact = mockContacts[0];

    fireEvent.press(getByTestId(`recipient-item-${selectedContact.address}`));

    expect(mockUpdateTo).toHaveBeenCalledWith(selectedContact.address);
    expect(mockHandleSubmitPress).toHaveBeenCalledWith(selectedContact.address);
  });

  it('handles address input change correctly', () => {
    const { getByTestId } = renderWithProvider(<Recipient />);
    const newAddress = '0x9876543210987654321098765432109876543210';

    fireEvent.changeText(getByTestId('recipient-input'), newAddress);

    expect(getByTestId('recipient-input').props.value).toBe(newAddress);
  });

  it('maintains keyboard avoiding view behavior', () => {
    const { getByTestId } = renderWithProvider(<Recipient />);

    expect(getByTestId('recipient-input')).toBeOnTheScreen();
  });
});
