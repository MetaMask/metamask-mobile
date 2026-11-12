import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsCrossMarginConfirmBottomSheetSelectorsIDs as ids } from '../../Perps.testIds';
import PerpsCrossMarginConfirmBottomSheet from './PerpsCrossMarginConfirmBottomSheet';

const ITEM_IDS = [ids.COLLATERAL_ITEM, ids.LIQUIDATION_ITEM, ids.MARGIN_ITEM];

// The shared BottomSheet mock runs dismiss synchronously. Production defers it
// until the close animation ends, and `isVisible={false}` can unmount the sheet
// first. This mock can hold that callback so tests cover the deferred path.
const mockCrossMarginBottomSheet = {
  flushDismiss: true,
  pendingDismiss: undefined as (() => void) | undefined,
  latestDismiss: undefined as (() => void) | undefined,
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  const BottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        onClose,
        goBack,
        testID,
      }: {
        children?: React.ReactNode;
        onClose?: () => void;
        goBack?: () => void;
        testID?: string;
      },
      ref: React.Ref<{
        onOpenBottomSheet: () => void;
        onCloseBottomSheet: () => void;
      }>,
    ) => {
      const dismiss = () => {
        onClose?.();
        goBack?.();
      };
      mockCrossMarginBottomSheet.latestDismiss = dismiss;
      ReactActual.useImperativeHandle(ref, () => ({
        onOpenBottomSheet: () => undefined,
        onCloseBottomSheet: () => {
          if (mockCrossMarginBottomSheet.flushDismiss) {
            dismiss();
            return;
          }
          mockCrossMarginBottomSheet.pendingDismiss = dismiss;
        },
      }));
      return ReactActual.createElement(View, { testID }, children);
    },
  );
  BottomSheet.displayName = 'BottomSheet';

  return {
    ...actual,
    BottomSheet,
  };
});

describe('PerpsCrossMarginConfirmBottomSheet', () => {
  const defaultProps = {
    onClose: jest.fn(),
    onConfirm: jest.fn(),
  };

  const acknowledgeAll = () => {
    ITEM_IDS.forEach((id) => fireEvent.press(screen.getByTestId(id)));
  };

  const runDismiss = (dismiss: (() => void) | undefined) => {
    act(() => {
      dismiss?.();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCrossMarginBottomSheet.flushDismiss = true;
    mockCrossMarginBottomSheet.pendingDismiss = undefined;
    mockCrossMarginBottomSheet.latestDismiss = undefined;
  });

  it('renders nothing when not visible', () => {
    render(
      <PerpsCrossMarginConfirmBottomSheet
        {...defaultProps}
        isVisible={false}
      />,
    );

    expect(screen.queryByTestId(ids.CONTAINER)).toBeNull();
  });

  it('renders the title, description and acknowledgement items', () => {
    render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

    expect(
      screen.getByText(strings('perps.cross_margin_confirm.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.cross_margin_confirm.description')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.cross_margin_confirm.collateral_title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('perps.cross_margin_confirm.liquidation_description'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.cross_margin_confirm.margin_title')),
    ).toBeOnTheScreen();
  });

  it('disables Confirm until every item is acknowledged', () => {
    render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

    expect(screen.getByTestId(ids.CONFIRM_BUTTON)).toBeDisabled();

    fireEvent.press(screen.getByTestId(ITEM_IDS[0]));
    fireEvent.press(screen.getByTestId(ITEM_IDS[1]));
    expect(screen.getByTestId(ids.CONFIRM_BUTTON)).toBeDisabled();

    fireEvent.press(screen.getByTestId(ITEM_IDS[2]));
    expect(screen.getByTestId(ids.CONFIRM_BUTTON)).toBeEnabled();
  });

  it('marks an item as checked when pressed', () => {
    render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);
    expect(screen.getByTestId(ids.COLLATERAL_ITEM)).not.toBeChecked();

    fireEvent.press(screen.getByTestId(ids.COLLATERAL_ITEM));

    expect(screen.getByTestId(ids.COLLATERAL_ITEM)).toBeChecked();
  });

  it('disables Confirm again when an item is unchecked', () => {
    render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);
    ITEM_IDS.forEach((id) => fireEvent.press(screen.getByTestId(id)));

    fireEvent.press(screen.getByTestId(ITEM_IDS[1]));

    expect(screen.getByTestId(ids.CONFIRM_BUTTON)).toBeDisabled();
  });

  it('calls onConfirm when Confirm is pressed after acknowledging all items', () => {
    render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);
    ITEM_IDS.forEach((id) => fireEvent.press(screen.getByTestId(id)));

    fireEvent.press(screen.getByTestId(ids.CONFIRM_BUTTON));

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('does not call onConfirm when Confirm is pressed while disabled', () => {
    render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

    fireEvent.press(screen.getByTestId(ids.CONFIRM_BUTTON));

    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('requires every item again after the sheet is hidden and shown', () => {
    const { rerender } = render(
      <PerpsCrossMarginConfirmBottomSheet {...defaultProps} />,
    );
    ITEM_IDS.forEach((id) => fireEvent.press(screen.getByTestId(id)));
    expect(screen.getByTestId(ids.CONFIRM_BUTTON)).toBeEnabled();

    rerender(
      <PerpsCrossMarginConfirmBottomSheet
        {...defaultProps}
        isVisible={false}
      />,
    );
    rerender(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

    expect(screen.getByTestId(ids.CONFIRM_BUTTON)).toBeDisabled();
    ITEM_IDS.forEach((id) => expect(screen.getByTestId(id)).not.toBeChecked());
  });

  it('clears acknowledgements when Go back is pressed', () => {
    render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);
    ITEM_IDS.forEach((id) => fireEvent.press(screen.getByTestId(id)));

    fireEvent.press(screen.getByTestId(ids.GO_BACK_BUTTON));

    expect(screen.getByTestId(ids.CONFIRM_BUTTON)).toBeDisabled();
    ITEM_IDS.forEach((id) => expect(screen.getByTestId(id)).not.toBeChecked());
  });

  it('does not call onConfirm when Go back is pressed', () => {
    render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

    fireEvent.press(screen.getByTestId(ids.GO_BACK_BUTTON));

    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the confirm close animation finishes after the sheet is hidden', () => {
    mockCrossMarginBottomSheet.flushDismiss = false;
    const { rerender } = render(
      <PerpsCrossMarginConfirmBottomSheet {...defaultProps} />,
    );
    acknowledgeAll();
    fireEvent.press(screen.getByTestId(ids.CONFIRM_BUTTON));

    rerender(
      <PerpsCrossMarginConfirmBottomSheet
        {...defaultProps}
        isVisible={false}
      />,
    );
    runDismiss(mockCrossMarginBottomSheet.pendingDismiss);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('calls onClose for a later dismiss after confirm hid the sheet before the close animation', () => {
    mockCrossMarginBottomSheet.flushDismiss = false;
    const { rerender } = render(
      <PerpsCrossMarginConfirmBottomSheet {...defaultProps} />,
    );
    acknowledgeAll();
    fireEvent.press(screen.getByTestId(ids.CONFIRM_BUTTON));

    rerender(
      <PerpsCrossMarginConfirmBottomSheet
        {...defaultProps}
        isVisible={false}
      />,
    );
    rerender(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);
    runDismiss(mockCrossMarginBottomSheet.latestDismiss);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores a confirm close animation that finishes after the sheet opens again', () => {
    mockCrossMarginBottomSheet.flushDismiss = false;
    const { rerender } = render(
      <PerpsCrossMarginConfirmBottomSheet {...defaultProps} />,
    );
    acknowledgeAll();
    fireEvent.press(screen.getByTestId(ids.CONFIRM_BUTTON));
    const lateConfirmDismiss = mockCrossMarginBottomSheet.pendingDismiss;

    rerender(
      <PerpsCrossMarginConfirmBottomSheet
        {...defaultProps}
        isVisible={false}
      />,
    );
    rerender(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);
    runDismiss(lateConfirmDismiss);

    expect(defaultProps.onClose).not.toHaveBeenCalled();

    runDismiss(mockCrossMarginBottomSheet.latestDismiss);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
