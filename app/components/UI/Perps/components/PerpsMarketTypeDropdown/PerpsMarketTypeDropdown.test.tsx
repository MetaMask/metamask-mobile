import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketTypeDropdown from './PerpsMarketTypeDropdown';
import type { MarketTypeFilter } from '../../controllers/types';

// Mock the i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.home.tabs.all': 'All',
      'perps.home.tabs.crypto': 'Crypto',
      'perps.home.tabs.stocks_and_commodities': 'Stocks & Commodities',
    };
    return translations[key] || key;
  },
}));

// Mock component-library components
jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ name, testID }: { name: string; testID?: string }) => (
      <Text testID={testID}>{name}</Text>
    ),
    IconName: {
      ArrowDown: 'ArrowDown',
    },
    IconSize: { Xs: 'xs' },
    IconColor: { Alternative: 'alternative' },
  };
});

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => <RNText testID={testID}>{children}</RNText>,
    TextVariant: { BodySM: 'BodySM' },
    TextColor: { Default: 'Default' },
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      style,
    }: {
      children: React.ReactNode;
      testID?: string;
      style?: object;
    }) => (
      <View testID={testID} style={style}>
        {children}
      </View>
    ),
  };
});

describe('PerpsMarketTypeDropdown', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(
        <PerpsMarketTypeDropdown selectedFilter="all" onPress={mockOnPress} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    it('renders with default testID', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeDropdown selectedFilter="all" onPress={mockOnPress} />,
      );

      expect(getByTestId('perps-market-type-dropdown')).toBeTruthy();
      expect(getByTestId('perps-market-type-dropdown-button')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeDropdown
          selectedFilter="all"
          onPress={mockOnPress}
          testID="custom-dropdown"
        />,
      );

      expect(getByTestId('custom-dropdown')).toBeTruthy();
      expect(getByTestId('custom-dropdown-button')).toBeTruthy();
    });

    it('renders arrow down icon', () => {
      const { getByText } = render(
        <PerpsMarketTypeDropdown selectedFilter="all" onPress={mockOnPress} />,
      );

      expect(getByText('ArrowDown')).toBeTruthy();
    });
  });

  describe('Filter Labels', () => {
    it.each<[MarketTypeFilter, string]>([
      ['all', 'All'],
      ['crypto', 'Crypto'],
      ['stocks_and_commodities', 'Stocks & Commodities'],
    ])(
      'displays correct label for %s filter',
      (filter: MarketTypeFilter, expectedLabel: string) => {
        const { getByText } = render(
          <PerpsMarketTypeDropdown
            selectedFilter={filter}
            onPress={mockOnPress}
          />,
        );

        expect(getByText(expectedLabel)).toBeTruthy();
      },
    );
  });

  describe('Interactions', () => {
    it('calls onPress when button is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeDropdown selectedFilter="all" onPress={mockOnPress} />,
      );

      const button = getByTestId('perps-market-type-dropdown-button');
      fireEvent.press(button);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress multiple times on repeated presses', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeDropdown selectedFilter="all" onPress={mockOnPress} />,
      );

      const button = getByTestId('perps-market-type-dropdown-button');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('button responds to press events', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeDropdown selectedFilter="all" onPress={mockOnPress} />,
      );

      const button = getByTestId('perps-market-type-dropdown-button');
      fireEvent.press(button);

      // Verify the button is interactive by confirming the press handler was called
      expect(mockOnPress).toHaveBeenCalled();
    });
  });
});
