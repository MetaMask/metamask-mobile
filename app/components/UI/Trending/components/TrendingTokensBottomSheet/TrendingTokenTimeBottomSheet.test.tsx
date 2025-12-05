import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  TrendingTokenTimeBottomSheet,
  TimeOption,
} from './TrendingTokenTimeBottomSheet';
import { SortTrendingBy } from '@metamask/assets-controllers';

const mockOnCloseBottomSheet = jest.fn();
const mockOnOpenBottomSheet = jest.fn();

let storedOnClose: (() => void) | undefined;

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
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
          onOpenBottomSheet: (cb?: () => void) => void;
          onCloseBottomSheet: (cb?: () => void) => void;
        }>,
      ) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        storedOnClose = onClose;
        useImperativeHandle(ref, () => ({
          onOpenBottomSheet: (cb?: () => void) => {
            mockOnOpenBottomSheet();
            cb?.();
          },
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
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
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

jest.mock('../../../../../component-library/components/Texts/Text', () => {
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

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
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
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    storedOnClose = undefined;
    mockOnClose.mockClear();
    mockOnOpenBottomSheet.mockClear();
  });

  it('renders with default 24 hours selected', () => {
    const { getByText, getByTestId } = render(
      <TrendingTokenTimeBottomSheet isVisible onClose={mockOnClose} />,
    );

    expect(getByText('Time')).toBeOnTheScreen();
    expect(getByText('24 hours')).toBeOnTheScreen();
    expect(getByTestId('icon-Check')).toBeOnTheScreen();
  });

  it('renders all time options', () => {
    const { getByText } = render(
      <TrendingTokenTimeBottomSheet isVisible onClose={mockOnClose} />,
    );

    expect(getByText('24 hours')).toBeOnTheScreen();
    expect(getByText('6 hours')).toBeOnTheScreen();
    expect(getByText('1 hour')).toBeOnTheScreen();
    expect(getByText('5 minutes')).toBeOnTheScreen();
  });

  it('calls onTimeSelect with correct sortBy when 24 hours is pressed', () => {
    const mockOnTimeSelect = jest.fn();

    const { getByText } = render(
      <TrendingTokenTimeBottomSheet
        isVisible
        onClose={mockOnClose}
        onTimeSelect={mockOnTimeSelect}
      />,
    );

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

    const { getByText } = render(
      <TrendingTokenTimeBottomSheet
        isVisible
        onClose={mockOnClose}
        onTimeSelect={mockOnTimeSelect}
      />,
    );

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

    const { getByText } = render(
      <TrendingTokenTimeBottomSheet
        isVisible
        onClose={mockOnClose}
        onTimeSelect={mockOnTimeSelect}
      />,
    );

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

    const { getByText } = render(
      <TrendingTokenTimeBottomSheet
        isVisible
        onClose={mockOnClose}
        onTimeSelect={mockOnTimeSelect}
      />,
    );

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

    const { getByText } = render(
      <TrendingTokenTimeBottomSheet
        isVisible
        onClose={mockOnClose}
        onTimeSelect={mockOnTimeSelect}
      />,
    );

    const option24h = getByText('24 hours');
    const parent = option24h.parent;
    if (!parent) throw new Error('Parent element not found');
    fireEvent.press(parent);

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is pressed', () => {
    const { getByTestId } = render(
      <TrendingTokenTimeBottomSheet isVisible onClose={mockOnClose} />,
    );

    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when sheet is closed via onClose callback', () => {
    render(<TrendingTokenTimeBottomSheet isVisible onClose={mockOnClose} />);

    if (storedOnClose) {
      storedOnClose();
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays check icon for selected time option', () => {
    const { getByText, getByTestId } = render(
      <TrendingTokenTimeBottomSheet isVisible onClose={mockOnClose} />,
    );

    expect(getByText('24 hours')).toBeOnTheScreen();
    expect(getByTestId('icon-Check')).toBeOnTheScreen();
  });

  it('does not render when isVisible is false', () => {
    const { queryByTestId } = render(
      <TrendingTokenTimeBottomSheet isVisible={false} onClose={mockOnClose} />,
    );

    expect(queryByTestId('bottom-sheet')).toBeNull();
  });

  it('uses selectedTime prop when provided', () => {
    const { getByText, getByTestId } = render(
      <TrendingTokenTimeBottomSheet
        isVisible
        onClose={mockOnClose}
        selectedTime={TimeOption.SixHours}
      />,
    );

    expect(getByText('6 hours')).toBeOnTheScreen();
    expect(getByTestId('icon-Check')).toBeOnTheScreen();
  });

  it('calls onOpenBottomSheet when isVisible becomes true', () => {
    const { rerender } = render(
      <TrendingTokenTimeBottomSheet isVisible={false} onClose={mockOnClose} />,
    );

    expect(mockOnOpenBottomSheet).not.toHaveBeenCalled();

    rerender(<TrendingTokenTimeBottomSheet isVisible onClose={mockOnClose} />);

    expect(mockOnOpenBottomSheet).toHaveBeenCalled();
  });
});
