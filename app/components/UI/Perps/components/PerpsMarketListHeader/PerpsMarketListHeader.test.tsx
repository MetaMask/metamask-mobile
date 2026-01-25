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
      'perps.search_by_token_symbol': 'Search by token symbol',
      'perps.cancel': 'Cancel',
    };
    return translations[key] || key;
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text: RNText } = jest.requireActual('react-native');
  return {
    Box: View,
    Text: RNText,
    BoxFlexDirection: { Row: 'row' },
    BoxAlignItems: { Center: 'center' },
    IconName: { Search: 'Search' },
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
      HeadingMD: 'HeadingMD',
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
      backButton: {},
      headerTitle: {},
      headerTitleContainer: {},
      titleButtonsRightContainer: {},
      searchButton: {},
      searchBarContainer: {},
    },
  }),
}));

jest.mock(
  '../../../../../component-library/components-temp/HeaderCenter',
  () => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    return {
      __esModule: true,
      default: ({
        title,
        onBack,
        endButtonIconProps,
        testID,
      }: {
        title: string;
        onBack: () => void;
        endButtonIconProps?: Array<{
          iconName: string;
          onPress: () => void;
          testID?: string;
        }>;
        testID?: string;
      }) =>
        React.createElement(
          View,
          { testID },
          React.createElement(
            TouchableOpacity,
            { testID: testID ? `${testID}-back-button` : undefined, onPress: onBack },
            React.createElement(Text, null, 'Back'),
          ),
          React.createElement(Text, null, title),
          endButtonIconProps?.map(
            (
              props: { iconName: string; onPress: () => void; testID?: string },
              index: number,
            ) =>
              React.createElement(
                TouchableOpacity,
                { key: index, testID: props.testID, onPress: props.onPress },
                React.createElement(Text, null, props.iconName),
              ),
          ),
        ),
    };
  },
);

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

    it('renders Cancel button when search is visible', () => {
      const { getByTestId } = render(
        <PerpsMarketListHeader
          isSearchVisible
          onSearchToggle={jest.fn()}
          testID="market-list-header"
        />,
      );

      const cancelButton = getByTestId('market-list-header-search-close');
      expect(cancelButton).toBeTruthy();
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
    it('dismisses keyboard when header is pressed in search mode', () => {
      const dismissSpy = jest.spyOn(Keyboard, 'dismiss');
      const { getByTestId } = render(
        <PerpsMarketListHeader
          isSearchVisible
          onSearchToggle={jest.fn()}
          testID="market-list-header"
        />,
      );

      const header = getByTestId('market-list-header');
      fireEvent.press(header);

      expect(dismissSpy).toHaveBeenCalledTimes(1);
    });

    it('does not dismiss keyboard when header is pressed in non-search mode', () => {
      const dismissSpy = jest.spyOn(Keyboard, 'dismiss');
      const { getByTestId } = render(
        <PerpsMarketListHeader
          isSearchVisible={false}
          onSearchToggle={jest.fn()}
          testID="market-list-header"
        />,
      );

      const header = getByTestId('market-list-header');
      fireEvent.press(header);

      expect(dismissSpy).not.toHaveBeenCalled();
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
