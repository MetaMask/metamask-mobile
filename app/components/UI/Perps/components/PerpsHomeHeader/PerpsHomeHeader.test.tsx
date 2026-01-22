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
      'perps.search_by_token_symbol': 'Search by token symbol',
      'perps.cancel': 'Cancel',
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
      ButtonIconSizes: { Md: 'md', Sm: 'sm' },
    };
  },
);

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text: RNText } = jest.requireActual('react-native');
  return {
    Box: View,
    Text: RNText,
    BoxFlexDirection: { Row: 'row' },
    BoxAlignItems: { Center: 'center' },
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        muted: '#999',
        default: '#000',
      },
    },
  }),
}));

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
    IconName: {
      Search: 'Search',
      ArrowLeft: 'ArrowLeft',
      CircleX: 'CircleX',
    },
    IconSize: { Sm: 'sm', Lg: 'lg', Md: 'md' },
    IconColor: { Default: 'Default', Alternative: 'Alternative' },
  };
});

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: Text,
    TextVariant: {
      BodyMD: 'BodyMD',
      HeadingLG: 'HeadingLG',
    },
    TextColor: {
      Default: 'Default',
    },
  };
});

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      header: {},
      headerContainerWrapper: {},
      headerTitle: {},
      searchButton: {},
      searchBarContainer: {},
    },
  }),
}));

jest.mock('../PerpsProviderSelector', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => (
      <View testID={testID || 'mock-provider-selector'} />
    ),
  };
});

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

    it('renders Cancel button when isSearchVisible is true', () => {
      const { getByTestId } = render(
        <PerpsHomeHeader
          isSearchVisible
          onSearchToggle={jest.fn()}
          testID="home-header"
        />,
      );

      const cancelButton = getByTestId('home-header-search-close');
      expect(cancelButton).toBeTruthy();
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
