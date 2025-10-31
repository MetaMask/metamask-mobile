import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { Keyboard } from 'react-native';
import PerpsMarketListHeader from './PerpsMarketListHeader';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => {
    const translations: Record<string, string> = {
      'perps.title': 'Perps',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsMarketListHeader', () => {
  const mockGoBack = jest.fn();
  const mockCanGoBack = jest.fn();
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
    } as Partial<ReturnType<typeof useNavigation>> as ReturnType<
      typeof useNavigation
    >);
    mockCanGoBack.mockReturnValue(true);
  });

  describe('Rendering', () => {
    it('renders with default title', () => {
      const { getByText } = render(
        <PerpsMarketListHeader onSearchToggle={jest.fn()} />,
      );

      expect(getByText('Perps')).toBeTruthy();
    });

    it('renders with custom title', () => {
      const { getByText } = render(
        <PerpsMarketListHeader
          title="Custom Markets"
          onSearchToggle={jest.fn()}
        />,
      );

      expect(getByText('Custom Markets')).toBeTruthy();
    });

    it('renders search icon when search is not visible', () => {
      const { getByTestId } = render(
        <PerpsMarketListHeader
          isSearchVisible={false}
          onSearchToggle={jest.fn()}
          testID="market-list-header"
        />,
      );

      const searchButton = getByTestId('market-list-header-search-toggle');
      expect(searchButton).toBeTruthy();
    });

    it('renders close icon when search is visible', () => {
      const { getByTestId } = render(
        <PerpsMarketListHeader
          isSearchVisible
          onSearchToggle={jest.fn()}
          testID="market-list-header"
        />,
      );

      const searchButton = getByTestId('market-list-header-search-toggle');
      expect(searchButton).toBeTruthy();
    });
  });

  describe('Default Navigation', () => {
    it('calls navigation.goBack() when back button is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketListHeader
          onSearchToggle={jest.fn()}
          testID="market-list-header"
        />,
      );

      const backButton = getByTestId('market-list-header-back-button');
      fireEvent.press(backButton);

      expect(mockCanGoBack).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call goBack when canGoBack returns false', () => {
      mockCanGoBack.mockReturnValue(false);
      const { getByTestId } = render(
        <PerpsMarketListHeader
          onSearchToggle={jest.fn()}
          testID="market-list-header"
        />,
      );

      const backButton = getByTestId('market-list-header-back-button');
      fireEvent.press(backButton);

      expect(mockCanGoBack).toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('Custom Handlers', () => {
    it('uses custom onBack handler when provided', () => {
      const customBackHandler = jest.fn();
      const { getByTestId } = render(
        <PerpsMarketListHeader
          onBack={customBackHandler}
          onSearchToggle={jest.fn()}
          testID="market-list-header"
        />,
      );

      const backButton = getByTestId('market-list-header-back-button');
      fireEvent.press(backButton);

      expect(customBackHandler).toHaveBeenCalledTimes(1);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('calls onSearchToggle when search button is pressed', () => {
      const mockSearchToggle = jest.fn();
      const { getByTestId } = render(
        <PerpsMarketListHeader
          onSearchToggle={mockSearchToggle}
          testID="market-list-header"
        />,
      );

      const searchButton = getByTestId('market-list-header-search-toggle');
      fireEvent.press(searchButton);

      expect(mockSearchToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Behavior', () => {
    it('dismisses keyboard when header is pressed', () => {
      const dismissSpy = jest.spyOn(Keyboard, 'dismiss');
      const { getByTestId } = render(
        <PerpsMarketListHeader
          onSearchToggle={jest.fn()}
          testID="market-list-header"
        />,
      );

      const header = getByTestId('market-list-header');
      fireEvent.press(header);

      expect(dismissSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test ID', () => {
    it('applies custom testID and derived testIDs', () => {
      const { getByTestId } = render(
        <PerpsMarketListHeader
          onSearchToggle={jest.fn()}
          testID="custom-header"
        />,
      );

      expect(getByTestId('custom-header')).toBeTruthy();
      expect(getByTestId('custom-header-back-button')).toBeTruthy();
      expect(getByTestId('custom-header-search-toggle')).toBeTruthy();
    });
  });
});
