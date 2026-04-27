import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PerpsHomeHeader from './PerpsHomeHeader';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'mainnet'),
}));

jest.mock('../../hooks/usePerpsProvider', () => ({
  usePerpsProvider: jest.fn(() => ({ isMultiProviderEnabled: false })),
}));

jest.mock('../PerpsProviderSelector', () => ({
  PerpsProviderSelectorBadge: () => null,
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => {
    const translations: Record<string, string> = {
      'perps.search_by_token_symbol': 'Search by token symbol',
      'perps.cancel': 'Cancel',
      'perps.title': 'Perps',
    };
    return translations[key] || key;
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    Box: View,
    BoxFlexDirection: { Row: 'row' },
    BoxAlignItems: { Center: 'center' },
    BoxFlexWrap: { Wrap: 'wrap' },
    FontWeight: { Bold: 'bold' },
    Text,
    TextVariant: {
      HeadingLg: 'HeadingLg',
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
    },
    TextColor: {
      TextDefault: 'TextDefault',
      WarningDefault: 'WarningDefault',
    },
    HeaderStandard: ({
      testID,
      onBack,
      backButtonProps,
      endButtonIconProps,
    }: {
      testID?: string;
      onBack?: () => void;
      backButtonProps?: { testID?: string };
      endButtonIconProps?: { testID?: string; onPress?: () => void }[];
    }) => (
      <View testID={testID}>
        <TouchableOpacity testID={backButtonProps?.testID} onPress={onBack} />
        {endButtonIconProps?.map((btn) => (
          <TouchableOpacity
            key={btn.testID ?? btn.onPress?.toString()}
            testID={btn.testID}
            onPress={btn.onPress}
          />
        ))}
      </View>
    ),
    Icon: ({ testID }: { testID?: string }) => <View testID={testID} />,
    IconName: {
      Search: 'Search',
      CircleX: 'CircleX',
    },
    IconSize: { Sm: 'sm', Md: 'md' },
    IconColor: { IconAlternative: 'IconAlternative' },
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    useTheme: jest.fn(() => mockTheme),
  };
});

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      header: {},
      headerContainerWrapper: {},
      searchButton: {},
      searchBarContainer: {},
      testnetBadge: {},
      testnetDot: {},
    },
  }),
}));

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

  describe('nav + search', () => {
    it('renders search action', () => {
      const { getByTestId } = render(
        <PerpsHomeHeader onSearchToggle={jest.fn()} testID="home-header" />,
      );

      expect(getByTestId('home-header-search-toggle')).toBeTruthy();
    });

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

    it('renders Cancel control and label when isSearchVisible is true', () => {
      const { getByTestId, getByText } = render(
        <PerpsHomeHeader
          isSearchVisible
          onSearchToggle={jest.fn()}
          testID="home-header"
        />,
      );

      expect(getByTestId('home-header-search-close')).toBeTruthy();
      expect(getByText('Cancel')).toBeOnTheScreen();
    });

    it('applies custom testID and derived testIDs', () => {
      const { getByTestId } = render(
        <PerpsHomeHeader onSearchToggle={jest.fn()} testID="custom-header" />,
      );

      expect(getByTestId('custom-header')).toBeTruthy();
      expect(getByTestId('custom-header-back-button')).toBeTruthy();
      expect(getByTestId('custom-header-search-toggle')).toBeTruthy();
    });
  });

  describe('segment="title"', () => {
    it('renders default title', () => {
      const { getByText, getByTestId } = render(
        <PerpsHomeHeader segment="title" testID="perps-home-heading" />,
      );

      expect(getByTestId('perps-home-heading')).toBeTruthy();
      expect(getByTestId('perps-home-heading-title')).toBeTruthy();
      expect(getByText('Perps')).toBeTruthy();
    });

    it('renders custom screenTitle', () => {
      const { getByText } = render(
        <PerpsHomeHeader segment="title" screenTitle="My Markets" testID="h" />,
      );

      expect(getByText('My Markets')).toBeTruthy();
    });
  });
});
