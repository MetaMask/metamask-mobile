import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { ApproveMethod } from '../../types/approve';
import { EditSpendingCapButton } from './edit-spending-cap-button';

describe('EditSpendingCapButton', () => {
  const defaultProps = {
    spendingCapProps: {
      approveMethod: ApproveMethod.APPROVE,
      balance: '1000',
      decimals: 18,
      spendingCap: '500',
      onSpendingCapUpdate: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders edit button', () => {
    const { getByTestId } = render(<EditSpendingCapButton {...defaultProps} />);

    const editButton = getByTestId('edit-spending-cap-button');
    expect(editButton).toBeOnTheScreen();
  });

  it('does not render modal initially', () => {
    const { queryByText } = render(<EditSpendingCapButton {...defaultProps} />);

    expect(queryByText('Edit approval limit')).toBeNull();
  });

  it('opens modal when edit button is pressed', () => {
    const { getByTestId, getByText } = render(
      <EditSpendingCapButton {...defaultProps} />,
    );

    const editButton = getByTestId('edit-spending-cap-button');
    fireEvent.press(editButton);

    expect(getByText('Edit approval limit')).toBeOnTheScreen();
  });

  it('closes modal when modal onClose is called', () => {
    const { getByTestId, getByText, queryByText } = render(
      <EditSpendingCapButton {...defaultProps} />,
    );

    const editButton = getByTestId('edit-spending-cap-button');
    fireEvent.press(editButton);

    expect(getByText('Edit approval limit')).toBeOnTheScreen();

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(queryByText('Edit approval limit')).toBeNull();
  });

  it('passes correct props to EditSpendingCapModal', () => {
    const { getByTestId, getByText } = render(
      <EditSpendingCapButton {...defaultProps} />,
    );

    const editButton = getByTestId('edit-spending-cap-button');
    fireEvent.press(editButton);

    expect(getByText('Account balance : 1000')).toBeOnTheScreen();
    expect(getByText('Save')).toBeOnTheScreen();
    expect(getByText('Cancel')).toBeOnTheScreen();
  });

  it('can reopen modal after closing', () => {
    const { getByTestId, getByText, queryByText } = render(
      <EditSpendingCapButton {...defaultProps} />,
    );

    const editButton = getByTestId('edit-spending-cap-button');
    fireEvent.press(editButton);

    expect(getByText('Edit approval limit')).toBeOnTheScreen();

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(queryByText('Edit approval limit')).toBeNull();

    fireEvent.press(editButton);

    expect(getByText('Edit approval limit')).toBeOnTheScreen();
  });
});
