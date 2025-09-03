import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { RecipientList } from './recipient-list';
import { RecipientType } from '../UI/recipient';

const mockOnRecipientSelected = jest.fn();

jest.mock('../../hooks/useAccountAvatarType', () => {
  const { AvatarAccountType } = jest.requireActual(
    '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount',
  );

  return {
    useAccountAvatarType: jest.fn(() => AvatarAccountType.JazzIcon),
  };
});

jest.mock('../../context/send-context/send-context', () => ({
  useSendContext: jest.fn(() => ({
    to: '0x1234567890123456789012345678901234567890',
  })),
}));

jest.mock('../UI/recipient', () => {
  const { Pressable, Text } = jest.requireActual('react-native');

  return {
    Recipient: ({
      recipient,
      isSelected,
      onPress,
    }: {
      recipient: RecipientType;
      isSelected: boolean;
      onPress: (recipient: RecipientType) => void;
    }) => (
      <Pressable
        testID={`recipient-${recipient.address}`}
        onPress={() => onPress(recipient)}
      >
        <Text testID={`recipient-name-${recipient.address}`}>
          {recipient.name}
        </Text>
        <Text testID={`recipient-address-${recipient.address}`}>
          {recipient.address}
        </Text>
        {isSelected && (
          <Text testID={`selected-${recipient.address}`}>Selected</Text>
        )}
      </Pressable>
    ),
  };
});

jest.mock('@shopify/flash-list', () => {
  const { View } = jest.requireActual('react-native');

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FlashList: ({ data, renderItem, keyExtractor }: any) => {
      const items = data.map((item: RecipientType, index: number) => (
        <View key={keyExtractor(item)} testID={`flashlist-item-${index}`}>
          {renderItem({ item })}
        </View>
      ));
      return <View testID="flashlist">{items}</View>;
    },
  };
});

describe('RecipientList', () => {
  const mockRecipients: RecipientType[] = [
    {
      name: 'Alice',
      address: '0x1234567890123456789012345678901234567890',
      fiatValue: '$100.00',
    },
    {
      name: 'Bob',
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      fiatValue: '$50.00',
    },
    {
      name: 'Charlie',
      address: '0x9876543210987654321098765432109876543210',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when data is provided', () => {
    it('renders list of recipients', () => {
      const { getByTestId, getByText } = render(
        <RecipientList
          data={mockRecipients}
          onRecipientSelected={mockOnRecipientSelected}
        />,
      );

      expect(getByTestId('flashlist')).toBeOnTheScreen();
      expect(getByText('Alice')).toBeOnTheScreen();
      expect(getByText('Bob')).toBeOnTheScreen();
      expect(getByText('Charlie')).toBeOnTheScreen();
    });

    it('marks selected recipient when address matches context', () => {
      const { getByTestId } = render(
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
      const { getByTestId } = render(
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
      const { getByTestId } = render(
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

      const { getByText, queryByTestId } = render(
        <RecipientList
          data={[]}
          onRecipientSelected={mockOnRecipientSelected}
          emptyMessage={emptyMessage}
        />,
      );

      expect(getByText(emptyMessage)).toBeOnTheScreen();
      expect(queryByTestId('flashlist')).toBeNull();
    });

    it('renders empty FlashList when no empty message provided', () => {
      const { getByTestId, queryByText } = render(
        <RecipientList
          data={[]}
          onRecipientSelected={mockOnRecipientSelected}
        />,
      );

      expect(getByTestId('flashlist')).toBeOnTheScreen();
      expect(queryByText(/No recipients/)).toBeNull();
    });
  });
});
