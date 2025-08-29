import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { AvatarAccountType } from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { Recipient, RecipientType } from './recipient';

describe('Recipient', () => {
  const createMockRecipient = (
    overrides: Partial<RecipientType> = {},
  ): RecipientType => ({
    accountName: 'John Doe',
    address: '0x1234567890123456789012345678901234567890',
    ...overrides,
  });

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders recipient name correctly', () => {
    const mockRecipient = createMockRecipient({
      accountName: 'Alice Smith',
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

  it('does not display fiat value when not provided', () => {
    const mockRecipient = createMockRecipient();

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

  it('renders contact name when account name is not provided', () => {
    const mockRecipient = createMockRecipient({
      accountName: undefined,
      contactName: 'Contact Name',
    });

    const { getByText } = renderWithProvider(
      <Recipient
        recipient={mockRecipient}
        accountAvatarType={AvatarAccountType.JazzIcon}
        onPress={mockOnPress}
      />,
    );

    expect(getByText('Contact Name')).toBeOnTheScreen();
  });

  it('renders account group name when BIP44 is true', () => {
    const mockRecipient = createMockRecipient({
      accountGroupName: 'Group Name',
      contactName: 'Contact Name',
    });

    const { getByText } = renderWithProvider(
      <Recipient
        recipient={mockRecipient}
        isBIP44
        accountAvatarType={AvatarAccountType.JazzIcon}
        onPress={mockOnPress}
      />,
    );

    expect(getByText('Group Name')).toBeOnTheScreen();
  });

  it('renders contact name when BIP44 is true and account group name is not provided', () => {
    const mockRecipient = createMockRecipient({
      accountGroupName: undefined,
      contactName: 'Contact Name',
    });

    const { getByText } = renderWithProvider(
      <Recipient
        recipient={mockRecipient}
        isBIP44
        accountAvatarType={AvatarAccountType.JazzIcon}
        onPress={mockOnPress}
      />,
    );

    expect(getByText('Contact Name')).toBeOnTheScreen();
  });
});
