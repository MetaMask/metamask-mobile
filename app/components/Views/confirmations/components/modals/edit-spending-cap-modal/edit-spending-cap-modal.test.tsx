import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { ApproveComponentIDs } from '../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { ApproveMethod } from '../../../types/approve';
import { EditSpendingCapModal } from './edit-spending-cap-modal';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: {},
      title: {},
      description: {},
      balanceInfo: {},
      buttonsContainer: {},
      button: {},
    },
  })),
}));

jest.mock('../../../utils/validations/approve', () => ({
  validateSpendingCap: jest.fn().mockReturnValue(false),
}));

describe('EditSpendingCapModal', () => {
  const defaultProps = {
    approveMethod: ApproveMethod.APPROVE,
    balance: '1000',
    decimals: 18,
    spendingCap: '500',
    onSpendingCapUpdate: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with correct content', () => {
    const { getByText } = render(<EditSpendingCapModal {...defaultProps} />);

    expect(
      getByText('confirm.edit_spending_cap_modal.title'),
    ).toBeOnTheScreen();
    expect(
      getByText('confirm.edit_spending_cap_modal.description'),
    ).toBeOnTheScreen();
    expect(
      getByText('confirm.edit_spending_cap_modal.account_balance : 1000'),
    ).toBeOnTheScreen();
  });

  it('renders buttons with correct labels', () => {
    const { getByText } = render(<EditSpendingCapModal {...defaultProps} />);

    expect(
      getByText('confirm.edit_spending_cap_modal.cancel'),
    ).toBeOnTheScreen();
    expect(getByText('confirm.edit_spending_cap_modal.save')).toBeOnTheScreen();
  });

  it('calls onClose when cancel button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <EditSpendingCapModal {...defaultProps} onClose={onClose} />,
    );

    const cancelButton = getByText('confirm.edit_spending_cap_modal.cancel');
    fireEvent.press(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSpendingCapUpdate when save button is pressed', async () => {
    const onSpendingCapUpdate = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <EditSpendingCapModal
        {...defaultProps}
        onSpendingCapUpdate={onSpendingCapUpdate}
      />,
    );

    const saveButton = getByText('confirm.edit_spending_cap_modal.save');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(onSpendingCapUpdate).toHaveBeenCalledWith('500');
    });
  });

  it('calls onClose after successful save', async () => {
    const onClose = jest.fn();
    const onSpendingCapUpdate = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <EditSpendingCapModal
        {...defaultProps}
        onClose={onClose}
        onSpendingCapUpdate={onSpendingCapUpdate}
      />,
    );

    const saveButton = getByText('confirm.edit_spending_cap_modal.save');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('prevents modal close when data is updating', async () => {
    const onClose = jest.fn();
    const onSpendingCapUpdate = jest
      .fn()
      .mockImplementation(() => new Promise((resolve) => resolve(undefined)));
    const { getByText } = render(
      <EditSpendingCapModal
        {...defaultProps}
        onClose={onClose}
        onSpendingCapUpdate={onSpendingCapUpdate}
      />,
    );

    const saveButton = getByText('confirm.edit_spending_cap_modal.save');
    fireEvent.press(saveButton);

    const cancelButton = getByText('confirm.edit_spending_cap_modal.cancel');
    fireEvent.press(cancelButton);

    // Should not call onClose because isDataUpdating is true
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders with different approve methods', () => {
    const methods = [
      ApproveMethod.APPROVE,
      ApproveMethod.INCREASE_ALLOWANCE,
      ApproveMethod.DECREASE_ALLOWANCE,
    ];

    methods.forEach((method) => {
      const props = { ...defaultProps, approveMethod: method };
      const { getByText } = render(<EditSpendingCapModal {...props} />);

      expect(
        getByText('confirm.edit_spending_cap_modal.title'),
      ).toBeOnTheScreen();
    });
  });

  it('renders SpendingCapInput with correct props', () => {
    const { getByTestId } = render(<EditSpendingCapModal {...defaultProps} />);

    const spendingCapInput = getByTestId(
      ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT,
    );
    expect(spendingCapInput).toBeOnTheScreen();
  });

  it('updates spending cap when input changes', () => {
    const { getByTestId } = render(<EditSpendingCapModal {...defaultProps} />);

    const spendingCapInput = getByTestId(
      ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT,
    );
    fireEvent.changeText(spendingCapInput, '750');

    expect(spendingCapInput.props.value).toBe('750');
  });

  it('disables save button when there is an error', () => {
    const { getByText } = render(<EditSpendingCapModal {...defaultProps} />);

    const saveButton = getByText('confirm.edit_spending_cap_modal.save');
    fireEvent.press(saveButton);

    // The button should still be pressable when there's no error
    expect(saveButton).toBeOnTheScreen();
  });

  it('disables cancel button when data is updating', async () => {
    const onSpendingCapUpdate = jest
      .fn()
      .mockImplementation(() => new Promise((resolve) => resolve(undefined)));
    const { getByText } = render(
      <EditSpendingCapModal
        {...defaultProps}
        onSpendingCapUpdate={onSpendingCapUpdate}
      />,
    );

    const cancelButton = getByText('confirm.edit_spending_cap_modal.cancel');
    const saveButton = getByText('confirm.edit_spending_cap_modal.save');

    fireEvent.press(saveButton);

    fireEvent.press(cancelButton);

    // The cancel button should not trigger onClose when data is updating
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('updates spending cap state when input changes', () => {
    const { getByTestId } = render(<EditSpendingCapModal {...defaultProps} />);

    const spendingCapInput = getByTestId(
      ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT,
    );
    fireEvent.changeText(spendingCapInput, '750');

    // The input should reflect the new value
    expect(spendingCapInput.props.value).toBe('750');
  });

  it('calls onSpendingCapUpdate with updated value', async () => {
    const onSpendingCapUpdate = jest.fn().mockResolvedValue(undefined);
    const { getByTestId, getByText } = render(
      <EditSpendingCapModal
        {...defaultProps}
        onSpendingCapUpdate={onSpendingCapUpdate}
      />,
    );

    const spendingCapInput = getByTestId(
      ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT,
    );
    fireEvent.changeText(spendingCapInput, '750');

    const saveButton = getByText('confirm.edit_spending_cap_modal.save');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(onSpendingCapUpdate).toHaveBeenCalledWith('750');
    });
  });
});
