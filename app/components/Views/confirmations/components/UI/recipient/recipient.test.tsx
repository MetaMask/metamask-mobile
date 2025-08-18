import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { AvatarAccountType } from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { Recipient, RecipientType } from './recipient';

describe('Recipient', () => {
  const createMockRecipient = (
    overrides: Partial<RecipientType> = {},
  ): RecipientType => ({
    name: 'John Doe',
    address: '0x1234567890123456789012345678901234567890',
    fiatValue: '$1,234.56',
    ...overrides,
  });

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders recipient name correctly', () => {
    const mockRecipient = createMockRecipient({
      name: 'Alice Smith',
    });

    const { getByText } = renderWithProvider(
      <Recipient
        recipient={mockRecipient}
        accountAvatarType={AvatarAccountType.JazzIcon}
        onPress={mockOnPress}
      />,
    );

    expect(getByText('Alice Smith')).toBeOnTheScreen();
  });

  it('displays fiat value when provided', () => {
    const mockRecipient = createMockRecipient({
      fiatValue: '$2,500.00',
    });

    const { getByText } = renderWithProvider(
      <Recipient
        recipient={mockRecipient}
        accountAvatarType={AvatarAccountType.Blockies}
        onPress={mockOnPress}
      />,
    );

    expect(getByText('$2,500.00')).toBeOnTheScreen();
  });

  it('does not display fiat value when not provided', () => {
    const mockRecipient = createMockRecipient({
      fiatValue: undefined,
    });

    const { queryByText } = renderWithProvider(
      <Recipient
        recipient={mockRecipient}
        accountAvatarType={AvatarAccountType.Maskicon}
        onPress={mockOnPress}
      />,
    );

    expect(queryByText('$')).not.toBeOnTheScreen();
  });

  it('calls onPress when recipient is pressed', () => {
    const mockRecipient = createMockRecipient();

    const { getByText } = renderWithProvider(
      <Recipient
        recipient={mockRecipient}
        accountAvatarType={AvatarAccountType.JazzIcon}
        onPress={mockOnPress}
      />,
    );

    fireEvent.press(getByText('John Doe'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(mockRecipient);
  });

  it('renders correctly when selected', () => {
    const mockRecipient = createMockRecipient();

    const { getByText } = renderWithProvider(
      <Recipient
        recipient={mockRecipient}
        isSelected
        accountAvatarType={AvatarAccountType.JazzIcon}
        onPress={mockOnPress}
      />,
    );

    expect(getByText('John Doe')).toBeOnTheScreen();
  });

  it('renders correctly when not selected', () => {
    const mockRecipient = createMockRecipient();

    const { getByText } = renderWithProvider(
      <Recipient
        recipient={mockRecipient}
        isSelected={false}
        accountAvatarType={AvatarAccountType.JazzIcon}
        onPress={mockOnPress}
      />,
    );

    expect(getByText('John Doe')).toBeOnTheScreen();
  });
});
