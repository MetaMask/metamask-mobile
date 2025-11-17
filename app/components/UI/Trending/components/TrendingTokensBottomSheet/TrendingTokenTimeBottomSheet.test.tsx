import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  TrendingTokenTimeBottomSheet,
  TimeOption,
} from './TrendingTokenTimeBottomSheet';
import { SortTrendingBy } from '@metamask/assets-controllers';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockOnCloseBottomSheet = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

const mockUseParams = jest.fn();
jest.mock('../../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
}));

let storedOnClose: (() => void) | undefined;

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const { forwardRef, useImperativeHandle } = jest.requireActual('react');

    const MockBottomSheet = forwardRef(
      (
        {
          children,
          onClose,
        }: {
          children: React.ReactNode;
          onClose?: () => void;
        },
        ref: React.Ref<{
          onCloseBottomSheet: (cb?: () => void) => void;
        }>,
      ) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        storedOnClose = onClose;
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (cb?: () => void) => {
            mockOnCloseBottomSheet();
            cb?.();
          },
        }));

        return <View testID="bottom-sheet">{children}</View>;
      },
    );

    return {
      __esModule: true,
      default: MockBottomSheet,
    };
  },
);

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { TouchableOpacity, View } = jest.requireActual('react-native');
    return ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose?: () => void;
    }) => (
      <View testID="bottom-sheet-header">
        <TouchableOpacity testID="close-button" onPress={onClose}>
          Close
        </TouchableOpacity>
        {children}
      </View>
    );
  },
);

jest.mock('../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: Text,
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodyMD: 'BodyMD',
    },
  };
});

jest.mock('../../../../component-library/components/Icons/Icon', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockIcon({ name, size }: { name: string; size: string }) {
      return (
        <RNView testID={`icon-${name}`} data-size={size}>
          {name}
        </RNView>
      );
    },
    IconName: {
      Check: 'Check',
    },
    IconSize: {
      Md: 'Md',
    },
  };
});

describe('TrendingTokenTimeBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storedOnClose = undefined;
    mockUseParams.mockReturnValue({});
  });

  it('renders with default 24 hours selected', () => {
    const { getByText, getByTestId } = render(<TrendingTokenTimeBottomSheet />);

    expect(getByText('Time')).toBeTruthy();
    expect(getByText('24 hours')).toBeTruthy();
    expect(getByTestId('icon-Check')).toBeTruthy();
  });

  it('renders all time options', () => {
    const { getByText } = render(<TrendingTokenTimeBottomSheet />);

    expect(getByText('24 hours')).toBeTruthy();
    expect(getByText('6 hours')).toBeTruthy();
    expect(getByText('1 hour')).toBeTruthy();
    expect(getByText('5 minutes')).toBeTruthy();
  });

  it('calls onTimeSelect with correct sortBy when 24 hours is pressed', () => {
    const mockOnTimeSelect = jest.fn();
    mockUseParams.mockReturnValue({
      onTimeSelect: mockOnTimeSelect,
    });

    const { getByText } = render(<TrendingTokenTimeBottomSheet />);

    const option24h = getByText('24 hours');
    const parent = option24h.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(mockOnTimeSelect).toHaveBeenCalledWith(
      'h24_trending' as SortTrendingBy,
      TimeOption.TwentyFourHours,
    );
  });

  it('calls onTimeSelect with correct sortBy when 6 hours is pressed', () => {
    const mockOnTimeSelect = jest.fn();
    mockUseParams.mockReturnValue({
      onTimeSelect: mockOnTimeSelect,
    });

    const { getByText } = render(<TrendingTokenTimeBottomSheet />);

    const option6h = getByText('6 hours');
    const parent = option6h.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(mockOnTimeSelect).toHaveBeenCalledWith(
      'h6_trending' as SortTrendingBy,
      TimeOption.SixHours,
    );
  });

  it('calls onTimeSelect with correct sortBy when 1 hour is pressed', () => {
    const mockOnTimeSelect = jest.fn();
    mockUseParams.mockReturnValue({
      onTimeSelect: mockOnTimeSelect,
    });

    const { getByText } = render(<TrendingTokenTimeBottomSheet />);

    const option1h = getByText('1 hour');
    const parent = option1h.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(mockOnTimeSelect).toHaveBeenCalledWith(
      'h1_trending' as SortTrendingBy,
      TimeOption.OneHour,
    );
  });

  it('calls onTimeSelect with correct sortBy when 5 minutes is pressed', () => {
    const mockOnTimeSelect = jest.fn();
    mockUseParams.mockReturnValue({
      onTimeSelect: mockOnTimeSelect,
    });

    const { getByText } = render(<TrendingTokenTimeBottomSheet />);

    const option5m = getByText('5 minutes');
    const parent = option5m.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(mockOnTimeSelect).toHaveBeenCalledWith(
      'm5_trending' as SortTrendingBy,
      TimeOption.FiveMinutes,
    );
  });

  it('closes bottom sheet when time option is pressed', () => {
    const mockOnTimeSelect = jest.fn();
    mockUseParams.mockReturnValue({
      onTimeSelect: mockOnTimeSelect,
    });

    const { getByText } = render(<TrendingTokenTimeBottomSheet />);

    const option24h = getByText('24 hours');
    const parent = option24h.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });

  it('navigates back when close button is pressed', () => {
    const { getByTestId } = render(<TrendingTokenTimeBottomSheet />);

    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });

  it('navigates back when sheet is closed via onClose', () => {
    render(<TrendingTokenTimeBottomSheet />);

    if (storedOnClose) {
      storedOnClose();
    }

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('displays check icon for selected time option', () => {
    const { getByText, getByTestId } = render(<TrendingTokenTimeBottomSheet />);

    expect(getByText('24 hours')).toBeTruthy();
    expect(getByTestId('icon-Check')).toBeTruthy();
  });
});
