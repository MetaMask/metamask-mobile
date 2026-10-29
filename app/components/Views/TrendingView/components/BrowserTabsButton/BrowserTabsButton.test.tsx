import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BrowserTabsButton from './BrowserTabsButton';
import { TrendingViewSelectorsIDs } from '../../TrendingView.testIds';

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

  describe('glass', () => {
    it('keeps the muted pill by default', () => {
      const { queryByTestId } = render(
        <BrowserTabsButton tabCount={1} onPress={jest.fn()} testID="tabs" />,
      );

      expect(
        queryByTestId(TrendingViewSelectorsIDs.BROWSER_TABS_BUTTON_GLASS),
      ).not.toBeOnTheScreen();
    });

    it('draws a glass capsule at the search bar height and keeps it pressable', () => {
      const mockOnPress = jest.fn();

      const { getByTestId, getByText } = render(
        <BrowserTabsButton
          tabCount={2}
          onPress={mockOnPress}
          testID="tabs"
          isGlass
        />,
      );

      expect(
        getByTestId(TrendingViewSelectorsIDs.BROWSER_TABS_BUTTON_GLASS),
      ).toHaveStyle({ height: 48 });
      expect(getByText('2')).toBeOnTheScreen();

      fireEvent.press(getByTestId('tabs'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });
});
