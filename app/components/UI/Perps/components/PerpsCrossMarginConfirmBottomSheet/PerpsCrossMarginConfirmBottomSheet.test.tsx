import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsCrossMarginConfirmBottomSheetSelectorsIDs as ids } from '../../Perps.testIds';
import PerpsCrossMarginConfirmBottomSheet from './PerpsCrossMarginConfirmBottomSheet';

const ITEM_IDS = [ids.COLLATERAL_ITEM, ids.LIQUIDATION_ITEM, ids.MARGIN_ITEM];

describe('PerpsCrossMarginConfirmBottomSheet', () => {
  const defaultProps = {
    onClose: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
  });
});
