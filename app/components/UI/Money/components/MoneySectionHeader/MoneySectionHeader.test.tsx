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

  it('does not render info button when onInfoPress is not provided', () => {
    const { queryByTestId } = render(
      <MoneySectionHeader title="Test Section" />,
    );

    expect(
      queryByTestId(MoneySectionHeaderTestIds.INFO_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('renders info button when onInfoPress is provided', () => {
    const { getByTestId } = render(
      <MoneySectionHeader title="Test Section" onInfoPress={jest.fn()} />,
    );

    expect(
      getByTestId(MoneySectionHeaderTestIds.INFO_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls onInfoPress when info button is pressed', () => {
    const mockOnInfoPress = jest.fn();
    const { getByTestId } = render(
      <MoneySectionHeader title="Test Section" onInfoPress={mockOnInfoPress} />,
    );

    fireEvent.press(getByTestId(MoneySectionHeaderTestIds.INFO_BUTTON));

    expect(mockOnInfoPress).toHaveBeenCalledTimes(1);
  });

  it('renders both info button and chevron when both props are provided', () => {
    const { getByTestId } = render(
      <MoneySectionHeader
        title="Test Section"
        onPress={jest.fn()}
        onInfoPress={jest.fn()}
      />,
    );

    expect(
      getByTestId(MoneySectionHeaderTestIds.INFO_BUTTON),
    ).toBeOnTheScreen();
    expect(getByTestId(MoneySectionHeaderTestIds.CHEVRON)).toBeOnTheScreen();
  });
});
