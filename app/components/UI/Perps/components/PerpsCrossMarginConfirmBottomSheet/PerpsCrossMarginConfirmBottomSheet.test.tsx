import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsCrossMarginConfirmBottomSheet from './PerpsCrossMarginConfirmBottomSheet';
import { PerpsCrossMarginConfirmBottomSheetSelectorsIDs } from './PerpsCrossMarginConfirmBottomSheet.testIds';

const {
  CONFIRM_BUTTON,
  GO_BACK_BUTTON,
  CLOSE_BUTTON,
  COLLATERAL_ITEM,
  LIQUIDATION_ITEM,
  MARGIN_ITEM,
} = PerpsCrossMarginConfirmBottomSheetSelectorsIDs;

describe('PerpsCrossMarginConfirmBottomSheet', () => {
  const defaultProps = {
    onConfirm: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the title and selection copy', () => {
      render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

      expect(screen.getByText('Confirm cross margin')).toBeTruthy();
      expect(
        screen.getByText('You selected cross margin for this order.'),
      ).toBeTruthy();
      expect(
        screen.getByText('Check this list to confirm you understand:'),
      ).toBeTruthy();
    });

    it('renders all three acknowledgement items unchecked', () => {
      render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

      expect(screen.getByText('Collateral')).toBeTruthy();
      expect(screen.getByText('Liquidation')).toBeTruthy();
      expect(screen.getByText('Margin')).toBeTruthy();

      [COLLATERAL_ITEM, LIQUIDATION_ITEM, MARGIN_ITEM].forEach((testID) => {
        expect(screen.getByTestId(testID).props.accessibilityState).toEqual({
          checked: false,
        });
      });
    });

    it('renders the go back and confirm buttons', () => {
      render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

      expect(screen.getByText('Go back')).toBeTruthy();
      expect(screen.getByText('Confirm')).toBeTruthy();
    });
  });

  describe('Acknowledgements', () => {
    it('checks an item when pressed', () => {
      render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

      fireEvent.press(screen.getByTestId(COLLATERAL_ITEM));

      expect(
        screen.getByTestId(COLLATERAL_ITEM).props.accessibilityState,
      ).toEqual({
        checked: true,
      });
    });

    it('unchecks an item when pressed twice', () => {
      render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

      fireEvent.press(screen.getByTestId(LIQUIDATION_ITEM));
      fireEvent.press(screen.getByTestId(LIQUIDATION_ITEM));

      expect(
        screen.getByTestId(LIQUIDATION_ITEM).props.accessibilityState,
      ).toEqual({
        checked: false,
      });
    });
  });

  describe('Confirm Button', () => {
    it('does not call onConfirm while any item is unchecked', () => {
      render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

      fireEvent.press(screen.getByTestId(COLLATERAL_ITEM));
      fireEvent.press(screen.getByTestId(MARGIN_ITEM));
      fireEvent.press(screen.getByTestId(CONFIRM_BUTTON));

      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('calls onConfirm once every item is checked', () => {
      render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

      fireEvent.press(screen.getByTestId(COLLATERAL_ITEM));
      fireEvent.press(screen.getByTestId(LIQUIDATION_ITEM));
      fireEvent.press(screen.getByTestId(MARGIN_ITEM));
      fireEvent.press(screen.getByTestId(CONFIRM_BUTTON));

      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dismissal', () => {
    it('calls onClose when go back is pressed', () => {
      render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

      fireEvent.press(screen.getByTestId(GO_BACK_BUTTON));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('calls onClose when the header close button is pressed', () => {
      render(<PerpsCrossMarginConfirmBottomSheet {...defaultProps} />);

      fireEvent.press(screen.getByTestId(CLOSE_BUTTON));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
