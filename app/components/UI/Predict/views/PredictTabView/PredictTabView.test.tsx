import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePredictPositions', () => ({
  usePredictPositions: jest.fn(() => ({
    positions: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadPositions: jest.fn(),
  })),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('@shopify/flash-list', () => {
  const { View } = jest.requireActual('react-native');
  return {
    FlashList: ({
      ListEmptyComponent,
    }: {
      ListEmptyComponent?: () => React.ReactElement;
    }) => ListEmptyComponent ? (
        <View testID="empty-state">{ListEmptyComponent()}</View>
      ) : null,
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    Box: View,
    Text,
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodyMd: 'BodyMd',
    },
  };
});

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: function MockIcon() {
      return <View testID="mock-icon" />;
    },
    IconName: {
      Details: 'Details',
    },
    IconSize: {
      XXL: 'XXL',
    },
    IconColor: {
      Muted: 'Muted',
    },
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockButton({
      onPress,
      label,
    }: {
      onPress: () => void;
      label: string;
    }) {
      return (
        <TouchableOpacity onPress={onPress} testID="explore-button">
          <Text>{label}</Text>
        </TouchableOpacity>
      );
    },
    ButtonVariants: {
      Primary: 'Primary',
    },
    ButtonSize: {
      Lg: 'Lg',
    },
    ButtonWidthTypes: {
      Auto: 'Auto',
    },
  };
});

import PredictTabView from './PredictTabView';

describe('PredictTabView', () => {
  it('renders empty state when positions array is empty', () => {
    render(<PredictTabView />);

    expect(screen.getByTestId('empty-state')).toBeOnTheScreen();
  });

  it('displays correct empty state content', () => {
    render(<PredictTabView />);

    expect(screen.getByTestId('mock-icon')).toBeOnTheScreen();
    expect(screen.getByText('predict.tab.no_predictions')).toBeOnTheScreen();
    expect(
      screen.getByText('predict.tab.no_predictions_description'),
    ).toBeOnTheScreen();
    expect(screen.getByText('predict.tab.explore')).toBeOnTheScreen();
  });

  it('navigates to market list when explore button is pressed', () => {
    const mockNavigate = jest.fn();
    const mockUseNavigation = useNavigation as jest.MockedFunction<
      typeof useNavigation
    >;
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);

    render(<PredictTabView />);
    fireEvent.press(screen.getByTestId('explore-button'));
    expect(mockNavigate).toHaveBeenCalledWith('PredictMarketList');
  });
});
