// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import QuickActionButton from './QuickActionButton';

describe('QuickActionButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders correctly with default props', () => {
    const { toJSON, getByText } = render(
      <QuickActionButton onPress={mockOnPress}>Test Button</QuickActionButton>,
    );

    expect(getByText('Test Button')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onPress handler when pressed', () => {
    const { getByText } = render(
      <QuickActionButton onPress={mockOnPress}>
        Clickable Button
      </QuickActionButton>,
    );

    const button = getByText('Clickable Button');
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const { getByText } = render(
      <QuickActionButton onPress={mockOnPress} isDisabled>
        Disabled Button
      </QuickActionButton>,
    );

    const button = getByText('Disabled Button');
    fireEvent.press(button);

    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('applies custom testID', () => {
    const { getByTestId } = render(
      <QuickActionButton onPress={mockOnPress} testID="custom-button">
        Test Button
      </QuickActionButton>,
    );

    expect(getByTestId('custom-button')).toBeTruthy();
  });
});
