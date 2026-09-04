import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BrowserTabsButton from './BrowserTabsButton';

describe('BrowserTabsButton', () => {
  it('renders the open tab count', () => {
    const { getByText } = render(
      <BrowserTabsButton tabCount={3} onPress={jest.fn()} testID="tabs" />,
    );

    expect(getByText('3')).toBeDefined();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <BrowserTabsButton tabCount={1} onPress={mockOnPress} testID="tabs" />,
    );

    fireEvent.press(getByTestId('tabs'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
