import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { ApproveMethod } from '../../types/approve';
import { validateSpendingCap } from '../../utils/validations/approve';
import { ApproveComponentIDs } from '../../ConfirmationView.testIds';
import { SpendingCapInput } from './spending-cap-input';

jest.mock('../../utils/validations/approve', () => ({
  validateSpendingCap: jest.fn(),
}));

describe('SpendingCapInput', () => {
  const defaultProps = {
    approveMethod: ApproveMethod.APPROVE,
    initialValue: '100',
    decimals: 18,
    onChange: jest.fn(),
    onErrorChange: jest.fn(),
  };

  const mockValidateSpendingCap = jest.mocked(validateSpendingCap);
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateSpendingCap.mockReturnValue(false);
  });

  it('renders with initial value', () => {
    const { getByTestId } = render(<SpendingCapInput {...defaultProps} />);

    const input = getByTestId(ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT);
    expect(input).toBeOnTheScreen();
  });

  it('calls onChange when input changes', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SpendingCapInput {...defaultProps} onChange={onChange} />,
    );

    const input = getByTestId(ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT);
    fireEvent.changeText(input, '200');

    expect(onChange).toHaveBeenCalledWith('200');
  });

  it('validates input on change', () => {
    mockValidateSpendingCap.mockReturnValue('Invalid input');
    const { getByTestId } = render(<SpendingCapInput {...defaultProps} />);

    const input = getByTestId(ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT);
    fireEvent.changeText(input, 'invalid');

    expect(mockValidateSpendingCap).toHaveBeenCalledWith(
      'invalid',
      18,
      ApproveMethod.APPROVE,
    );
  });

  it('calls onErrorChange when validation fails', () => {
    const onErrorChange = jest.fn();
    mockValidateSpendingCap.mockReturnValue('Error message');

    const { getByTestId } = render(
      <SpendingCapInput {...defaultProps} onErrorChange={onErrorChange} />,
    );

    const input = getByTestId(ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT);
    fireEvent.changeText(input, 'invalid');

    expect(onErrorChange).toHaveBeenCalledWith('Error message');
  });

  it('calls onErrorChange with false when validation passes', () => {
    const onErrorChange = jest.fn();
    mockValidateSpendingCap.mockReturnValue(false);

    const { getByTestId } = render(
      <SpendingCapInput {...defaultProps} onErrorChange={onErrorChange} />,
    );

    const input = getByTestId(ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT);
    fireEvent.changeText(input, '100');

    expect(onErrorChange).toHaveBeenCalledWith(false);
  });

  it('trims whitespace from input', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SpendingCapInput {...defaultProps} onChange={onChange} />,
    );

    const input = getByTestId(ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT);
    fireEvent.changeText(input, '  150  ');

    expect(onChange).toHaveBeenCalledWith('150');
  });

  it('renders with different approve methods', () => {
    const methods = [
      ApproveMethod.APPROVE,
      ApproveMethod.INCREASE_ALLOWANCE,
      ApproveMethod.DECREASE_ALLOWANCE,
    ];

    methods.forEach((method) => {
      const props = { ...defaultProps, approveMethod: method };
      const { getByTestId } = render(<SpendingCapInput {...props} />);

      const input = getByTestId(ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT);
      expect(input).toBeOnTheScreen();
    });
  });

  it('calls onErrorChange on initial render', () => {
    const onErrorChange = jest.fn();
    render(
      <SpendingCapInput {...defaultProps} onErrorChange={onErrorChange} />,
    );

    expect(onErrorChange).toHaveBeenCalledWith(false);
  });
});
