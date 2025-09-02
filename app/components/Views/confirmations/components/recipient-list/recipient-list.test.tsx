import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { RecipientList } from './recipient-list';
import { RecipientType } from '../UI/recipient';

jest.mock('../../hooks/useAccountAvatarType', () => ({
  useAccountAvatarType: jest.fn(() => 'JazzIcon'),
}));

jest.mock('../../context/send-context/send-context', () => ({
  useSendContext: jest.fn(() => ({
    to: '0x1234567890123456789012345678901234567890',
  })),
}));

jest.mock('../../hooks/send/useSendScope', () => ({
  useSendScope: jest.fn(() => ({
    isBIP44: false,
    isSolanaOnly: false,
    isEvmOnly: false,
    account: undefined,
  })),
}));

const mockOnRecipientSelected = jest.fn();

describe('RecipientList', () => {
  const mockRecipients: RecipientType[] = [
    {
      accountName: 'Alice',
      address: '0x1234567890123456789012345678901234567890',
    },
    {
      accountName: 'Bob',
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    },
    {
      accountName: 'Charlie',
      address: '0x9876543210987654321098765432109876543210',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when data is provided', () => {
    it('renders list of recipients', () => {
      const { getByText } = renderWithProvider(
        <RecipientList
          data={mockRecipients}
          onRecipientSelected={mockOnRecipientSelected}
        />,
      );

      expect(getByText('Accounts')).toBeOnTheScreen();
      expect(getByText('Alice')).toBeOnTheScreen();
      expect(getByText('Bob')).toBeOnTheScreen();
      expect(getByText('Charlie')).toBeOnTheScreen();
    });

    it('marks selected recipient when address matches context', () => {
      const { getByTestId } = renderWithProvider(
        <RecipientList
          data={mockRecipients}
          onRecipientSelected={mockOnRecipientSelected}
        />,
      );

      expect(
        getByTestId('selected-0x1234567890123456789012345678901234567890'),
      ).toBeOnTheScreen();
    });

    it('calls onRecipientSelected when recipient is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <RecipientList
          data={mockRecipients}
          onRecipientSelected={mockOnRecipientSelected}
        />,
      );

      fireEvent.press(
        getByTestId('recipient-0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'),
      );

      expect(mockOnRecipientSelected).toHaveBeenCalledTimes(1);
      expect(mockOnRecipientSelected).toHaveBeenCalledWith(mockRecipients[1]);
    });

    it('renders all recipient addresses correctly', () => {
      const { getByTestId } = renderWithProvider(
        <RecipientList
          data={mockRecipients}
          onRecipientSelected={mockOnRecipientSelected}
        />,
      );

      mockRecipients.forEach((recipient) => {
        expect(
          getByTestId(`recipient-address-${recipient.address}`),
        ).toBeOnTheScreen();
      });
    });
  });

  describe('when data is empty', () => {
    it('renders empty message when provided', () => {
      const emptyMessage = 'No recipients found';

      const { getByText, queryByText } = renderWithProvider(
        <RecipientList
          data={[]}
          onRecipientSelected={mockOnRecipientSelected}
          emptyMessage={emptyMessage}
        />,
      );

      expect(getByText(emptyMessage)).toBeOnTheScreen();
      expect(queryByText('Accounts')).toBeNull();
    });

    it('renders empty container when no empty message provided', () => {
      const { getByText, queryByText } = renderWithProvider(
        <RecipientList
          data={[]}
          onRecipientSelected={mockOnRecipientSelected}
        />,
      );

      expect(getByText('Accounts')).toBeOnTheScreen();
      expect(queryByText(/No recipients/)).toBeNull();
    });
  });
});
