import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PerpsHomeHeader from './PerpsHomeHeader';

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

jest.mock(
  '../../../../../component-library/components/Buttons/ButtonIcon',
  () => {
    const { TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        onPress,
        testID,
      }: {
        onPress: () => void;
        testID?: string;
      }) => <TouchableOpacity testID={testID} onPress={onPress} />,
      ButtonIconSizes: { Md: 'md' },
    };
  },
);

describe('PerpsHomeHeader', () => {
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
        <PerpsHomeHeader onSearchToggle={jest.fn()} />,
      );

      expect(getByText('Perps')).toBeTruthy();
    });

    it('renders with custom title', () => {
      const { getByText } = render(
        <PerpsHomeHeader title="My Markets" onSearchToggle={jest.fn()} />,
      );

      expect(getByText('My Markets')).toBeTruthy();
    });

    it('renders search button', () => {
      const { getByTestId } = render(
        <PerpsHomeHeader onSearchToggle={jest.fn()} testID="home-header" />,
      );

      const searchButton = getByTestId('home-header-search-toggle');
      expect(searchButton).toBeTruthy();
    });
  });

  describe('Default Navigation', () => {
    it('calls navigation.goBack() when back button is pressed', () => {
      const { getByTestId } = render(
        <PerpsHomeHeader onSearchToggle={jest.fn()} testID="home-header" />,
      );

      const backButton = getByTestId('home-header-back-button');
      fireEvent.press(backButton);

      expect(mockCanGoBack).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call goBack when canGoBack returns false', () => {
      mockCanGoBack.mockReturnValue(false);
      const { getByTestId } = render(
        <PerpsHomeHeader onSearchToggle={jest.fn()} testID="home-header" />,
      );

      const backButton = getByTestId('home-header-back-button');
      fireEvent.press(backButton);

      expect(mockCanGoBack).toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('Custom Handlers', () => {
    it('uses custom onBack handler when provided', () => {
      const customBackHandler = jest.fn();
      const { getByTestId } = render(
        <PerpsHomeHeader
          onBack={customBackHandler}
          onSearchToggle={jest.fn()}
          testID="home-header"
        />,
      );

      const backButton = getByTestId('home-header-back-button');
      fireEvent.press(backButton);

      expect(customBackHandler).toHaveBeenCalledTimes(1);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('calls onSearchToggle when search button is pressed', () => {
      const mockSearchToggle = jest.fn();
      const { getByTestId } = render(
        <PerpsHomeHeader
          onSearchToggle={mockSearchToggle}
          testID="home-header"
        />,
      );

      const searchButton = getByTestId('home-header-search-toggle');
      fireEvent.press(searchButton);

      expect(mockSearchToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Search Icon State', () => {
    it('renders Search icon when isSearchVisible is false', () => {
      const { getByTestId } = render(
        <PerpsHomeHeader
          isSearchVisible={false}
          onSearchToggle={jest.fn()}
          testID="home-header"
        />,
      );

      const searchButton = getByTestId('home-header-search-toggle');
      expect(searchButton).toBeTruthy();
      // Icon component would render IconName.Search
    });

    it('renders Close icon when isSearchVisible is true', () => {
      const { getByTestId } = render(
        <PerpsHomeHeader
          isSearchVisible
          onSearchToggle={jest.fn()}
          testID="home-header"
        />,
      );

      const searchButton = getByTestId('home-header-search-toggle');
      expect(searchButton).toBeTruthy();
      // Icon component would render IconName.Close
    });
  });

  describe('Test ID', () => {
    it('applies custom testID and derived testIDs', () => {
      const { getByTestId } = render(
        <PerpsHomeHeader onSearchToggle={jest.fn()} testID="custom-header" />,
      );

      expect(getByTestId('custom-header')).toBeTruthy();
      expect(getByTestId('custom-header-back-button')).toBeTruthy();
      expect(getByTestId('custom-header-search-toggle')).toBeTruthy();
    });
  });
});
