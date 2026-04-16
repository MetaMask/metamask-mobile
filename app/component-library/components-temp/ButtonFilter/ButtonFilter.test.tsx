import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import ButtonFilter from './ButtonFilter';

describe('ButtonFilter', () => {
  const defaultProps = {
    children: 'All',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with children prop', () => {
    const { getByRole } = render(<ButtonFilter {...defaultProps} />);

    expect(getByRole('button')).toBeOnTheScreen();
  });

  it('renders correctly in active state', () => {
    const { toJSON } = render(<ButtonFilter {...defaultProps} isActive />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly in inactive state', () => {
    const { toJSON } = render(
      <ButtonFilter {...defaultProps} isActive={false} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <ButtonFilter {...defaultProps} onPress={mockOnPress} />,
    );

    const button = getByRole('button');
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('verifies disabled state prevents interaction', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <ButtonFilter
        {...defaultProps}
        testID="filter-button"
        onPress={mockOnPress}
        isDisabled
      />,
    );

    const button = getByTestId('filter-button');
    expect(button).toBeDisabled();

    fireEvent.press(button);
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('uses custom accessibility label when provided', () => {
    const { getByTestId } = render(
      <ButtonFilter
        {...defaultProps}
        testID="filter-button"
        accessibilityLabel="Filter by all"
      />,
    );

    const button = getByTestId('filter-button');
    expect(button).toHaveAccessibleName('Filter by all');
  });

  it('spreads additional props to ButtonBase', () => {
    const customStyle = { marginTop: 20 };

    const { getByTestId } = render(
      <ButtonFilter
        {...defaultProps}
        testID="filter-button"
        style={customStyle}
      />,
    );

    const button = getByTestId('filter-button');
    expect(button).toBeOnTheScreen();
    expect(button).toHaveStyle(customStyle);
  });
});
