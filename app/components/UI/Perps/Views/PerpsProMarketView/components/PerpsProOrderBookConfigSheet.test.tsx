import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PerpsProOrderBookConfigSheet from './PerpsProOrderBookConfigSheet';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

const mockOnOpenBottomSheet = jest.fn();
const mockOnCloseBottomSheet = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    View: NativeView,
    Text: NativeText,
    Pressable: NativePressable,
  } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        testID,
        onClose,
      }: {
        children: React.ReactNode;
        testID?: string;
        onClose?: () => void;
      },
      ref: React.Ref<{
        onOpenBottomSheet: typeof mockOnOpenBottomSheet;
        onCloseBottomSheet: typeof mockOnCloseBottomSheet;
      }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onOpenBottomSheet: mockOnOpenBottomSheet,
        onCloseBottomSheet: (callback?: () => void) => {
          mockOnCloseBottomSheet(callback);
          callback?.();
        },
      }));

      return (
        <NativeView testID={testID}>
          {children}
          <NativePressable
            testID="mock-sheet-overlay-close"
            onPress={onClose}
          />
        </NativeView>
      );
    },
  );
  MockBottomSheet.displayName = 'MockBottomSheet';

  const MockBottomSheetHeader = ({
    children,
    onClose,
    closeButtonProps,
  }: {
    children: React.ReactNode;
    onClose?: () => void;
    closeButtonProps?: { testID?: string };
  }) => (
    <NativeView>
      <NativeText>{children}</NativeText>
      <NativePressable
        testID={closeButtonProps?.testID}
        onPress={onClose}
        accessibilityRole="button"
      />
    </NativeView>
  );

  const MockBottomSheetFooter = ({
    primaryButtonProps,
  }: {
    primaryButtonProps?: {
      children?: React.ReactNode;
      onPress?: () => void;
      isDisabled?: boolean;
      testID?: string;
    };
  }) => (
    <NativePressable
      testID={primaryButtonProps?.testID}
      onPress={primaryButtonProps?.onPress}
      disabled={primaryButtonProps?.isDisabled}
      accessibilityState={{ disabled: primaryButtonProps?.isDisabled }}
    >
      <NativeText>{primaryButtonProps?.children}</NativeText>
    </NativePressable>
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
    BottomSheetFooter: MockBottomSheetFooter,
  };
});

const defaultProps = {
  isVisible: true,
  baseSymbol: 'BTC',
  currency: 'usd' as const,
  metric: 'total' as const,
  grouping: 1,
  groupingOptions: [0.1, 1, 10, 100, 1000],
  onApply: jest.fn(),
  onClose: jest.fn(),
  testID: 'config-sheet',
};

const renderSheet = (
  props: Partial<
    React.ComponentProps<typeof PerpsProOrderBookConfigSheet>
  > = {},
) =>
  renderWithProvider(
    <PerpsProOrderBookConfigSheet {...defaultProps} {...props} />,
    {
      state: { engine: { backgroundState } },
    },
  );

describe('PerpsProOrderBookConfigSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when not visible', () => {
    const { queryByTestId } = renderSheet({ isVisible: false });

    expect(queryByTestId('config-sheet')).toBeNull();
  });

  it('renders listed-by and group-by options when visible', () => {
    const { getByTestId, getByText } = renderSheet();

    expect(getByTestId('config-sheet')).toBeOnTheScreen();
    expect(getByText('Order book settings')).toBeOnTheScreen();
    expect(getByTestId('config-sheet-currency-base')).toBeOnTheScreen();
    expect(getByTestId('config-sheet-currency-usd')).toBeOnTheScreen();
    expect(getByTestId('config-sheet-metric-size')).toBeOnTheScreen();
    expect(getByTestId('config-sheet-metric-total')).toBeOnTheScreen();
    expect(getByTestId('config-sheet-grouping-1')).toBeOnTheScreen();
    expect(getByTestId('config-sheet-grouping-1000')).toBeOnTheScreen();
  });

  it('opens the bottom sheet when it becomes visible', () => {
    const { rerender } = render(
      <PerpsProOrderBookConfigSheet {...defaultProps} isVisible={false} />,
    );

    rerender(<PerpsProOrderBookConfigSheet {...defaultProps} isVisible />);

    expect(mockOnOpenBottomSheet).toHaveBeenCalled();
  });

  it('applies draft currency, metric, and grouping on Save', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = renderSheet({ onApply, onClose });

    fireEvent.press(getByTestId('config-sheet-currency-base'));
    fireEvent.press(getByTestId('config-sheet-metric-size'));
    fireEvent.press(getByTestId('config-sheet-grouping-10'));
    fireEvent.press(getByTestId('config-sheet-apply'));

    expect(onApply).toHaveBeenCalledWith({
      currency: 'base',
      metric: 'size',
      grouping: 10,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not apply when grouping is null', () => {
    const onApply = jest.fn();
    const { getByTestId } = renderSheet({ grouping: null, onApply });

    fireEvent.press(getByTestId('config-sheet-apply'));

    expect(onApply).not.toHaveBeenCalled();
  });

  it('closes via the header close control', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderSheet({ onClose });

    fireEvent.press(getByTestId('config-sheet-close'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps in-progress draft selections when live grouping props change', () => {
    const onApply = jest.fn();
    const { getByTestId, rerender } = renderWithProvider(
      <PerpsProOrderBookConfigSheet
        {...defaultProps}
        grouping={1}
        onApply={onApply}
      />,
      { state: { engine: { backgroundState } } },
    );

    fireEvent.press(getByTestId('config-sheet-grouping-100'));

    rerender(
      <PerpsProOrderBookConfigSheet
        {...defaultProps}
        grouping={10}
        onApply={onApply}
      />,
    );

    fireEvent.press(getByTestId('config-sheet-apply'));

    expect(onApply).toHaveBeenCalledWith({
      currency: 'usd',
      metric: 'total',
      grouping: 100,
    });
  });

  it('resets draft selections from props when the sheet reopens', () => {
    const onApply = jest.fn();
    const { getByTestId, rerender } = renderWithProvider(
      <PerpsProOrderBookConfigSheet
        {...defaultProps}
        grouping={1}
        onApply={onApply}
      />,
      { state: { engine: { backgroundState } } },
    );

    fireEvent.press(getByTestId('config-sheet-grouping-100'));

    rerender(
      <PerpsProOrderBookConfigSheet
        {...defaultProps}
        isVisible={false}
        grouping={1}
        onApply={onApply}
      />,
    );
    rerender(
      <PerpsProOrderBookConfigSheet
        {...defaultProps}
        isVisible
        grouping={1}
        onApply={onApply}
      />,
    );

    fireEvent.press(getByTestId('config-sheet-apply'));

    expect(onApply).toHaveBeenCalledWith({
      currency: 'usd',
      metric: 'total',
      grouping: 1,
    });
  });
});
