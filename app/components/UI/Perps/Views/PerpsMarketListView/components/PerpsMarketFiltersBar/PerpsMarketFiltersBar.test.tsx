import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketFiltersBar from './PerpsMarketFiltersBar';

jest.mock('../../../../components/PerpsMarketSortDropdowns', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      selectedOptionId,
      onSortPress,
      testID,
    }: {
      selectedOptionId: string;
      onSortPress: () => void;
      testID?: string;
    }) => (
      <TouchableOpacity testID={testID} onPress={onSortPress}>
        <Text>{selectedOptionId}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock(
  '../../../../../../../component-library/components/Icons/Icon',
  () => {
    const { Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ name, testID }: { name: string; testID?: string }) => (
        <Text testID={testID}>{name}</Text>
      ),
      IconName: {
        Star: 'Star',
        StarFilled: 'StarFilled',
      },
      IconSize: { Sm: 'sm' },
    };
  },
);

jest.mock(
  '../../../../../../../component-library/components/Texts/Text',
  () => {
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
      TextVariant: { BodyMD: 'BodyMD' },
    };
  },
);

describe('PerpsMarketFiltersBar', () => {
  const mockOnSortPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="openInterest"
          onSortPress={mockOnSortPress}
        />,
      );

      expect(toJSON()).toBeTruthy();
    });

    it('renders sort dropdown with correct props', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="volume"
          onSortPress={mockOnSortPress}
          testID="filters-bar"
        />,
      );

      const sortDropdown = getByTestId('filters-bar-sort');
      expect(sortDropdown).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('calls onSortPress when sort dropdown is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="openInterest"
          onSortPress={mockOnSortPress}
          testID="filters-bar"
        />,
      );

      const sortDropdown = getByTestId('filters-bar-sort');
      fireEvent.press(sortDropdown);

      expect(mockOnSortPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Test IDs', () => {
    it('applies custom testID and derived testIDs', () => {
      const { getByTestId } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="openInterest"
          onSortPress={mockOnSortPress}
          testID="custom-filters"
        />,
      );

      expect(getByTestId('custom-filters')).toBeTruthy();
      expect(getByTestId('custom-filters-sort')).toBeTruthy();
    });

    it('handles missing testID gracefully', () => {
      const { toJSON } = render(
        <PerpsMarketFiltersBar
          selectedOptionId="openInterest"
          onSortPress={mockOnSortPress}
        />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });
});
