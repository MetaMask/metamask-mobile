import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { RecipientList } from './recipient-list';
import type { RecipientType } from '../UI/recipient';

jest.mock('../../hooks/useAccountAvatarType', () => ({
  useAccountAvatarType: jest.fn(() => 'JazzIcon'),
}));

jest.mock('../../context/send-context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'send.accounts': 'Your Accounts',
      'send.contacts': 'Contacts',
    };
    return map[key] ?? key;
  }),
}));

jest.mock('../UI/recipient', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Recipient: ({ recipient, isSelected, onPress }: any) => {
    const { Pressable, Text, View } = jest.requireActual('react-native');
    return (
      <View>
        <Pressable
          testID={
            isSelected
              ? `selected-${recipient.address}`
              : `recipient-${recipient.address}`
          }
          onPress={() => onPress?.(recipient)}
        >
          <Text>
            {recipient.accountGroupName ||
              recipient.accountName ||
              recipient.contactName ||
              recipient.address}
          </Text>
        </Pressable>
      </View>
    );
  },
}));

const { useSendContext } = jest.requireMock(
  '../../context/send-context/send-context',
);

describe('RecipientList - BIP44 grouping', () => {
  const onRecipientSelected = jest.fn();

  const data: RecipientType[] = [
    {
      address: '0x1111111111111111111111111111111111111111',
      walletName: 'Wallet A',
      accountGroupName: 'Account Group 1',
    },
    {
      address: '0x2222222222222222222222222222222222222222',
      walletName: 'Wallet A',
      accountGroupName: 'Account Group 2',
    },
    {
      address: '0x3333333333333333333333333333333333333333',
      walletName: 'Wallet B',
      accountGroupName: 'Account Group 3',
    },
    {
      address: '0x4444444444444444444444444444444444444444',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useSendContext.mockReturnValue({
      to: '0x2222222222222222222222222222222222222222',
    });
  });

  it('renders group headers for each wallet and Unknown Wallet', () => {
    const { getByText } = renderWithProvider(
      <RecipientList data={data} onRecipientSelected={onRecipientSelected} />,
    );

    expect(getByText('Wallet A')).toBeOnTheScreen();
    expect(getByText('Wallet B')).toBeOnTheScreen();
    expect(getByText('Unknown Wallet')).toBeOnTheScreen();
  });

  it('marks the selected recipient based on `to` address', () => {
    const { getByTestId } = renderWithProvider(
      <RecipientList data={data} onRecipientSelected={onRecipientSelected} />,
    );

    expect(
      getByTestId('selected-0x2222222222222222222222222222222222222222'),
    ).toBeOnTheScreen();
    expect(
      getByTestId('recipient-0x1111111111111111111111111111111111111111'),
    ).toBeOnTheScreen();
  });

  it('calls onRecipientSelected when a recipient is pressed (enabled)', () => {
    const { getByTestId } = renderWithProvider(
      <RecipientList data={data} onRecipientSelected={onRecipientSelected} />,
    );

    fireEvent.press(
      getByTestId('recipient-0x1111111111111111111111111111111111111111'),
    );
    expect(onRecipientSelected).toHaveBeenCalledTimes(1);
    expect(onRecipientSelected).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0x1111111111111111111111111111111111111111',
      }),
    );
  });

  it('does not call onRecipientSelected when disabled', () => {
    const { getByTestId } = renderWithProvider(
      <RecipientList
        data={data}
        onRecipientSelected={onRecipientSelected}
        disabled
      />,
    );

    fireEvent.press(
      getByTestId('recipient-0x1111111111111111111111111111111111111111'),
    );
    expect(onRecipientSelected).not.toHaveBeenCalled();
  });

  it('renders empty state when data is empty and emptyMessage provided', () => {
    const { getByText } = renderWithProvider(
      <RecipientList
        data={[]}
        onRecipientSelected={onRecipientSelected}
        emptyMessage="No recipients"
      />,
    );

    expect(getByText('No recipients')).toBeOnTheScreen();
  });

  it('renders contacts header for contact lists', () => {
    const contactData: RecipientType[] = [
      {
        address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        contactName: 'Alice',
      },
    ];

    const { getByText } = renderWithProvider(
      <RecipientList
        data={contactData}
        onRecipientSelected={onRecipientSelected}
        isContactList
      />,
    );

    expect(getByText('Contacts')).toBeOnTheScreen();
  });
});
