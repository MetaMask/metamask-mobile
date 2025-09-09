import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { doENSLookup } from '../../../../../../util/ENSUtils';
import { useSendContext } from '../../../context/send-context/send-context';
import { useAccounts } from '../../../hooks/send/useAccounts';
import { useContacts } from '../../../hooks/send/useContacts';
import { useToAddressValidation } from '../../../hooks/send/useToAddressValidation';
import { useRecipientSelectionMetrics } from '../../../hooks/send/metrics/useRecipientSelectionMetrics';
import { useSendActions } from '../../../hooks/send/useSendActions';
import { useSendType } from '../../../hooks/send/useSendType';
import { RecipientType } from '../../UI/recipient';
import { Recipient } from './recipient';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actual,
    // Run focus effects as a normal effect during tests
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = effect();
        return cleanup;
      }, []);
    },
  };
});

const mockAccounts: RecipientType[] = [
  {
    accountName: 'Account 1',
    address: '0x1234567890123456789012345678901234567890',
  },
  {
    accountName: 'Account 2',
    address: '0x0987654321098765432109876543210987654321',
  },
];

const mockContacts: RecipientType[] = [
  {
    contactName: 'John Doe',
    address: '0x1111111111111111111111111111111111111111',
  },
];

jest.mock('../../../context/send-context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../../../hooks/send/useAccounts', () => ({
  useAccounts: jest.fn(),
}));

jest.mock('../../../hooks/send/useContacts', () => ({
  useContacts: jest.fn(),
}));

jest.mock('../../../hooks/send/useToAddressValidation', () => ({
  useToAddressValidation: jest.fn(),
}));

jest.mock('../../../hooks/send/metrics/useRecipientSelectionMetrics', () => ({
  useRecipientSelectionMetrics: jest.fn(),
}));

jest.mock('../../../hooks/send/useSendActions', () => ({
  useSendActions: jest.fn(),
}));

jest.mock('../../../hooks/send/useRouteParams', () => ({
  useRouteParams: jest.fn(),
}));

jest.mock('./recipient.styles', () => ({
  styleSheet: jest.fn(() => ({
    container: { flex: 1 },
  })),
}));

jest.mock('../../../hooks/send/useSendType', () => ({
  useSendType: jest.fn(),
}));

jest.mock('../../../../../../util/ENSUtils', () => ({
  doENSLookup: jest.fn(),
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
            <Text>{recipient.accountName || recipient.contactName}</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));

jest.mock('../../recipient-input', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RecipientInput: ({ isRecipientSelectedFromList }: any) => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="recipient-input">
        <Text>
          RecipientInput - isRecipientSelectedFromList:{' '}
          {isRecipientSelectedFromList.toString()}
        </Text>
      </View>
    );
  },
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

const mockDoENSLookup = jest.mocked(doENSLookup);
const mockUseSendContext = jest.mocked(useSendContext);
const mockUseAccounts = jest.mocked(useAccounts);
const mockUseContacts = jest.mocked(useContacts);
const mockUseToAddressValidation = jest.mocked(useToAddressValidation);
const mockUseRecipientSelectionMetrics = jest.mocked(
  useRecipientSelectionMetrics,
);
const mockUseSendActions = jest.mocked(useSendActions);
const mockUseSendType = jest.mocked(useSendType);

describe('Recipient', () => {
  const mockUpdateTo = jest.fn();
  const mockHandleSubmitPress = jest.fn();
  const mockCaptureRecipientSelected = jest.fn();
  const mockSetRecipientInputMethodManual = jest.fn();
  const mockSetRecipientInputMethodSelectAccount = jest.fn();
  const mockSetRecipientInputMethodSelectContact = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSendContext.mockReturnValue({
      to: '',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    mockUseAccounts.mockReturnValue(mockAccounts);
    mockUseContacts.mockReturnValue(mockContacts);

    mockUseToAddressValidation.mockReturnValue({
      toAddressError: undefined,
      toAddressWarning: undefined,
      loading: false,
      resolvedAddress: undefined,
    });

    mockUseRecipientSelectionMetrics.mockReturnValue({
      captureRecipientSelected: mockCaptureRecipientSelected,
      setRecipientInputMethodManual: mockSetRecipientInputMethodManual,
      setRecipientInputMethodPasted: jest.fn(),
      setRecipientInputMethodSelectAccount:
        mockSetRecipientInputMethodSelectAccount,
      setRecipientInputMethodSelectContact:
        mockSetRecipientInputMethodSelectContact,
    });

    mockUseSendActions.mockReturnValue({
      handleSubmitPress: mockHandleSubmitPress,
      handleCancelPress: jest.fn(),
      handleBackPress: jest.fn(),
    });

    mockDoENSLookup.mockReturnValue(Promise.resolve(''));
    mockUseSendType.mockReturnValue({
      isEvmSendType: true,
      isEvmNativeSendType: false,
      isNonEvmSendType: false,
      isNonEvmNativeSendType: false,
      isSolanaSendType: false,
    });
  });

  it('renders recipient input correctly', () => {
    const { getByTestId } = renderWithProvider(<Recipient />);

    expect(getByTestId('recipient-input')).toBeOnTheScreen();
  });

  it('displays account list', () => {
    const { getByTestId, getByText } = renderWithProvider(<Recipient />);

    expect(getByTestId('recipient-list-accounts')).toBeOnTheScreen();
    expect(getByText('Account 1')).toBeOnTheScreen();
    expect(getByText('Account 2')).toBeOnTheScreen();
  });

  it('displays contacts list', () => {
    const { getByTestId, getByText } = renderWithProvider(<Recipient />);

    expect(getByTestId('recipient-list-contacts')).toBeOnTheScreen();
    expect(getByText('John Doe')).toBeOnTheScreen();
  });

  it('shows review button when address input has content and not selected from list', () => {
    mockUseSendContext.mockReturnValue({
      to: '0x1234567890123456789012345678901234567890',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    const { getByText } = renderWithProvider(<Recipient />);

    expect(getByText('Review')).toBeOnTheScreen();
  });

  it('does not show review button when address is empty', () => {
    const { queryByText } = renderWithProvider(<Recipient />);

    expect(queryByText('Review')).not.toBeOnTheScreen();
  });

  it('calls updateTo and handleSubmitPress when account is selected from list', () => {
    const { getByTestId } = renderWithProvider(<Recipient />);
    const selectedAccount = mockAccounts[0];

    fireEvent.press(getByTestId(`recipient-item-${selectedAccount.address}`));

    expect(mockUpdateTo).toHaveBeenCalledWith(selectedAccount.address);
    expect(mockHandleSubmitPress).toHaveBeenCalledWith(selectedAccount.address);
    expect(mockSetRecipientInputMethodSelectAccount).toHaveBeenCalledTimes(1);
    expect(mockCaptureRecipientSelected).toHaveBeenCalledTimes(1);
  });

  it('calls updateTo and handleSubmitPress when contact is selected from list', () => {
    const { getByTestId } = renderWithProvider(<Recipient />);
    const selectedContact = mockContacts[0];

    fireEvent.press(getByTestId(`recipient-item-${selectedContact.address}`));

    expect(mockUpdateTo).toHaveBeenCalledWith(selectedContact.address);
    expect(mockHandleSubmitPress).toHaveBeenCalledWith(selectedContact.address);
    expect(mockSetRecipientInputMethodSelectContact).toHaveBeenCalledTimes(1);
    expect(mockCaptureRecipientSelected).toHaveBeenCalledTimes(1);
  });

  it('call handleSubmitPress with reolved address when submitted', () => {
    const mockHandleSubmitPress = jest.fn();
    mockUseSendActions.mockReturnValue({
      handleSubmitPress: mockHandleSubmitPress,
      handleCancelPress: jest.fn(),
      handleBackPress: jest.fn(),
    });

    mockUseToAddressValidation.mockReturnValue({
      toAddressError: undefined,
      toAddressWarning: undefined,
      loading: false,
      resolvedAddress: 'some_dummy_address',
    });

    mockUseSendContext.mockReturnValue({
      to: '0x1234567890123456789012345678901234567890',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    const { getByTestId } = renderWithProvider(<Recipient />);

    fireEvent.press(getByTestId('review-button-send'));

    expect(mockHandleSubmitPress).toHaveBeenCalledWith('some_dummy_address');
  });

  it('passes correct isRecipientSelectedFromList prop to RecipientInput initially', () => {
    const { getByText } = renderWithProvider(<Recipient />);

    expect(
      getByText('RecipientInput - isRecipientSelectedFromList: false'),
    ).toBeOnTheScreen();
  });

  it('updates isRecipientSelectedFromList when recipient is selected from accounts list', () => {
    const { getByTestId, getByText } = renderWithProvider(<Recipient />);
    const selectedAccount = mockAccounts[0];

    fireEvent.press(getByTestId(`recipient-item-${selectedAccount.address}`));

    expect(
      getByText('RecipientInput - isRecipientSelectedFromList: true'),
    ).toBeOnTheScreen();
  });

  it('updates isRecipientSelectedFromList when recipient is selected from contacts list', () => {
    const { getByTestId, getByText } = renderWithProvider(<Recipient />);
    const selectedContact = mockContacts[0];

    fireEvent.press(getByTestId(`recipient-item-${selectedContact.address}`));

    expect(
      getByText('RecipientInput - isRecipientSelectedFromList: true'),
    ).toBeOnTheScreen();
  });

  it('hides review button when recipient is selected from list', () => {
    mockUseSendContext.mockReturnValue({
      to: '0x1234567890123456789012345678901234567890',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    const { getByTestId, queryByText } = renderWithProvider(<Recipient />);

    fireEvent.press(getByTestId(`recipient-item-${mockAccounts[0].address}`));

    expect(queryByText('Review')).not.toBeOnTheScreen();
  });

  it('renders with correct layout structure', () => {
    const { getByTestId } = renderWithProvider(<Recipient />);

    expect(getByTestId('recipient-input')).toBeOnTheScreen();
    expect(getByTestId('recipient-list-accounts')).toBeOnTheScreen();
    expect(getByTestId('recipient-list-contacts')).toBeOnTheScreen();
  });

  it('renders warning banner when toAddressWarning is present', () => {
    mockUseToAddressValidation.mockReturnValue({
      toAddressError: undefined,
      toAddressWarning: 'Warning',
      loading: false,
      resolvedAddress: undefined,
    });

    mockUseSendContext.mockReturnValue({
      to: '0x1234567890123456789012345678901234567890',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    const { queryByTestId } = renderWithProvider(<Recipient />);
    expect(queryByTestId('to-address-warning-banner')).toBeOnTheScreen();
  });

  it('renders warning banner and disabled button when toAddressWarning and toAddressError is present', () => {
    mockUseToAddressValidation.mockReturnValue({
      toAddressError: 'Error',
      toAddressWarning: 'Warning',
      loading: false,
      resolvedAddress: undefined,
    });

    mockUseSendContext.mockReturnValue({
      to: '0x1234567890123456789012345678901234567890',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    const { getByTestId, queryByText } = renderWithProvider(<Recipient />);

    expect(getByTestId('to-address-warning-banner')).toBeOnTheScreen();
    expect(queryByText('Review')).not.toBeOnTheScreen();
    expect(queryByText('Error')).toBeOnTheScreen();
  });

  it('button is disabled if loading returned by validating hook is true', () => {
    const mockHandleSubmitPress = jest.fn();
    mockUseSendActions.mockReturnValue({
      handleSubmitPress: mockHandleSubmitPress,
      handleCancelPress: jest.fn(),
      handleBackPress: jest.fn(),
    });

    mockUseToAddressValidation.mockReturnValue({
      toAddressError: undefined,
      toAddressWarning: undefined,
      loading: true,
      resolvedAddress: undefined,
    });

    mockUseSendContext.mockReturnValue({
      to: '0x1234567890123456789012345678901234567890',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    const { getByText } = renderWithProvider(<Recipient />);
    fireEvent.press(getByText('Review'));

    expect(mockHandleSubmitPress).not.toHaveBeenCalled();
  });
});
