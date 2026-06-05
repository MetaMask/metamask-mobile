import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import PerpsHomeHeader from './PerpsHomeHeader';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'mainnet'),
}));

jest.mock('../../hooks/usePerpsProvider', () => ({
  usePerpsProvider: jest.fn(),
}));

jest.mock('../PerpsProviderSelector', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    PerpsProviderSelectorBadge: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
  };
});

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
      backButtonProps?: {
        testID?: string;
        accessibilityLabel?: string;
      };
      endButtonIconProps?: {
        testID?: string;
        onPress?: () => void;
        accessibilityLabel?: string;
      }[];
    }) => (
      <View testID={testID}>
        <TouchableOpacity
          accessibilityLabel={backButtonProps?.accessibilityLabel}
          testID={backButtonProps?.testID}
          onPress={onBack}
        />
        {endButtonIconProps?.map((btn) => (
          <TouchableOpacity
            key={
              btn.testID ?? btn.accessibilityLabel ?? btn.onPress?.toString()
            }
            accessibilityLabel={btn.accessibilityLabel}
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

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUsePerpsProvider = usePerpsProvider as jest.MockedFunction<
  typeof usePerpsProvider
>;

describe('PerpsHomeHeader', () => {
  const mockGoBack = jest.fn();
  const mockCanGoBack = jest.fn();
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation(() => 'mainnet');
    mockUsePerpsProvider.mockReturnValue({
      activeProvider: undefined,
      availableProviders: [],
      switchProvider: jest.fn(),
      isProviderAvailable: jest.fn(),
      isMYXProvider: false,
      isHyperLiquidProvider: false,
      isMultiProviderEnabled: false,
    } as ReturnType<typeof usePerpsProvider>);
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

    it('uses a11y labels for back and search when testID is omitted', () => {
      const onSearchToggle = jest.fn();
      const { getByLabelText } = render(
        <PerpsHomeHeader onSearchToggle={onSearchToggle} />,
      );

      fireEvent.press(getByLabelText('Back'));
      expect(mockGoBack).toHaveBeenCalled();

      fireEvent.press(getByLabelText('Search'));
      expect(onSearchToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onSearchToggle when cancel is pressed in search mode', () => {
      const onSearchToggle = jest.fn();
      const { getByTestId } = render(
        <PerpsHomeHeader
          isSearchVisible
          onSearchToggle={onSearchToggle}
          testID="home-header"
        />,
      );

      fireEvent.press(getByTestId('home-header-search-close'));

      expect(onSearchToggle).toHaveBeenCalledTimes(1);
    });

    it('shows search clear and calls onSearchClear when query has text', () => {
      const onSearchClear = jest.fn();
      const { getByTestId } = render(
        <PerpsHomeHeader
          isSearchVisible
          searchQuery="eth"
          onSearchClear={onSearchClear}
          onSearchToggle={jest.fn()}
          testID="home-header"
        />,
      );

      fireEvent.press(getByTestId('home-header-search-clear'));

      expect(onSearchClear).toHaveBeenCalledTimes(1);
    });

    it('hides search clear when query is empty', () => {
      const { queryByTestId } = render(
        <PerpsHomeHeader
          isSearchVisible
          searchQuery=""
          onSearchClear={jest.fn()}
          onSearchToggle={jest.fn()}
          testID="home-header"
        />,
      );

      expect(queryByTestId('home-header-search-clear')).toBeNull();
    });

    it('hides search clear when onSearchClear is omitted', () => {
      const { queryByTestId } = render(
        <PerpsHomeHeader
          isSearchVisible
          searchQuery="eth"
          onSearchToggle={jest.fn()}
          testID="home-header"
        />,
      );

      expect(queryByTestId('home-header-search-clear')).toBeNull();
    });

    it('search mode renders without header testID', () => {
      const onSearchToggle = jest.fn();
      const { getByPlaceholderText, getByText, queryByTestId } = render(
        <PerpsHomeHeader
          isSearchVisible
          searchQuery="x"
          onSearchQueryChange={jest.fn()}
          onSearchClear={jest.fn()}
          onSearchToggle={onSearchToggle}
        />,
      );

      expect(queryByTestId('home-header-search-bar')).toBeNull();
      expect(getByPlaceholderText('Search by token symbol')).toBeOnTheScreen();
      fireEvent.press(getByText('Cancel'));
      expect(onSearchToggle).toHaveBeenCalledTimes(1);
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

    it('renders provider badge when multi-provider is enabled', () => {
      mockUsePerpsProvider.mockReturnValue({
        activeProvider: undefined,
        availableProviders: [],
        switchProvider: jest.fn(),
        isProviderAvailable: jest.fn(),
        isMYXProvider: false,
        isHyperLiquidProvider: false,
        isMultiProviderEnabled: true,
      } as ReturnType<typeof usePerpsProvider>);

      const { getByTestId } = render(
        <PerpsHomeHeader segment="title" testID="perps-title" />,
      );

      expect(getByTestId('perps-title-provider-badge')).toBeOnTheScreen();
    });

    it('renders testnet badge when network is testnet and multi-provider is off', () => {
      mockUseSelector.mockImplementation(() => 'testnet');

      const { getByTestId, getByText } = render(
        <PerpsHomeHeader segment="title" testID="perps-title" />,
      );

      expect(getByText('Testnet')).toBeOnTheScreen();
      expect(getByTestId('perps-title-testnet-badge')).toBeOnTheScreen();
    });

    it('omits derived title testID when testID is omitted', () => {
      const { getByText, queryByTestId } = render(
        <PerpsHomeHeader segment="title" />,
      );

      expect(getByText('Perps')).toBeOnTheScreen();
      expect(queryByTestId('perps-home-heading-title')).toBeNull();
    });
  });
});
