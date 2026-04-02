import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneySectionHeader from './MoneySectionHeader';
import { MoneySectionHeaderTestIds } from './MoneySectionHeader.testIds';

describe('MoneySectionHeader', () => {
  it('renders the title text', () => {
    const { getByText } = render(<MoneySectionHeader title="Test Section" />);

    expect(getByText('Test Section')).toBeOnTheScreen();
  });

  it('does not render chevron when onPress is not provided', () => {
    const { queryByTestId } = render(
      <MoneySectionHeader title="Test Section" />,
    );

    expect(
      queryByTestId(MoneySectionHeaderTestIds.CHEVRON),
    ).not.toBeOnTheScreen();
  });

  it('renders chevron when onPress is provided', () => {
    const { getByTestId } = render(
      <MoneySectionHeader title="Test Section" onPress={jest.fn()} />,
    );

    expect(getByTestId(MoneySectionHeaderTestIds.CHEVRON)).toBeOnTheScreen();
  });

  it('calls onPress when header is tapped', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <MoneySectionHeader title="Test Section" onPress={mockOnPress} />,
    );

    fireEvent.press(getByText('Test Section'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
