import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { getNavbar } from './navbar';
import { mockTheme } from '../../../../../../util/theme';

describe('getNavbar', () => {
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('default behavior', () => {
    it('renders the header title correctly', () => {
      const title = 'Test Title';

      const { getByText } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            theme: mockTheme,
            title,
          }).headerTitle()}
        </>,
      );

      expect(getByText(title)).toBeOnTheScreen();
    });

    it('calls onReject when the back button is pressed', () => {
      const { getByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            theme: mockTheme,
            title: 'Test Title',
          }).headerLeft()}
        </>,
      );

      const backButton = getByTestId('Test Title-navbar-back-button');
      fireEvent.press(backButton);

      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('returns center-aligned header by default', () => {
      const result = getNavbar({
        onReject: mockOnReject,
        theme: mockTheme,
        title: 'Test Title',
      });

      expect(result.headerTitleAlign).toBe('center');
    });

    it('applies theme background color to header style', () => {
      const result = getNavbar({
        onReject: mockOnReject,
        theme: mockTheme,
        title: 'Test Title',
      });

      expect(result.headerStyle.backgroundColor).toBe(
        mockTheme.colors.background.alternative,
      );
    });
  });

  describe('overrides', () => {
    it('uses custom headerTitle when provided in overrides', () => {
      const customHeaderTitle = () => (
        <Text testID="custom-header-title">Custom Title</Text>
      );

      const { getByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            theme: mockTheme,
            title: 'Test Title',
            overrides: { headerTitle: customHeaderTitle },
          }).headerTitle()}
        </>,
      );

      expect(getByTestId('custom-header-title')).toBeOnTheScreen();
    });

    it('uses custom headerLeft when provided and passes onBackPress', () => {
      const customHeaderLeft = (onBackPress: () => void) => (
        <View testID="custom-header-left" onTouchEnd={onBackPress} />
      );

      const { getByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            theme: mockTheme,
            title: 'Test Title',
            overrides: { headerLeft: customHeaderLeft },
          }).headerLeft()}
        </>,
      );

      const customLeft = getByTestId('custom-header-left');
      expect(customLeft).toBeOnTheScreen();

      fireEvent(customLeft, 'touchEnd');
      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('applies custom headerTitleAlign from overrides', () => {
      const result = getNavbar({
        onReject: mockOnReject,
        theme: mockTheme,
        title: 'Test Title',
        overrides: { headerTitleAlign: 'left' },
      });

      expect(result.headerTitleAlign).toBe('left');
    });

    it('merges custom headerStyle with default styles', () => {
      const result = getNavbar({
        onReject: mockOnReject,
        theme: mockTheme,
        title: 'Test Title',
        overrides: { headerStyle: { borderBottomWidth: 2 } },
      });

      expect(result.headerStyle.backgroundColor).toBe(
        mockTheme.colors.background.alternative,
      );
      expect(result.headerStyle.borderBottomWidth).toBe(2);
    });
  });
});
