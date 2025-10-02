import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import BalanceEmptyState from './BalanceEmptyState';

describe('BalanceEmptyState', () => {
  it('renders correctly with default props', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <BalanceEmptyState
        title="Fund your wallet"
        subtitle="Buy tokens to get started"
        actionText="Buy crypto"
        testID="balance-empty-state"
      />,
    );

    expect(getByTestId('balance-empty-state')).toBeDefined();
    expect(getByText('Fund your wallet')).toBeDefined();
    expect(getByText('Buy tokens to get started')).toBeDefined();
    expect(getByText('Buy crypto')).toBeDefined();
  });

  it('calls onAction when button is pressed', () => {
    const mockOnAction = jest.fn();
    const { getByTestId } = renderWithProvider(
      <BalanceEmptyState onAction={mockOnAction} />,
    );

    const actionButton = getByTestId('balance-empty-state-action-button');
    fireEvent.press(actionButton);

    expect(mockOnAction).toHaveBeenCalledTimes(1);
  });

  it('renders without action button when onAction is not provided', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <BalanceEmptyState />,
    );

    expect(getByTestId('balance-empty-state')).toBeTruthy();
    expect(queryByTestId('balance-empty-state-action-button')).toBeTruthy(); // Button should still render
  });

  it('has proper test IDs for all elements', () => {
    const { getByTestId } = renderWithProvider(
      <BalanceEmptyState testID="test-component" />,
    );

    expect(getByTestId('test-component')).toBeTruthy();
    expect(getByTestId('test-component-image')).toBeTruthy();
    expect(getByTestId('test-component-title')).toBeTruthy();
    expect(getByTestId('test-component-subtitle')).toBeTruthy();
    expect(getByTestId('test-component-action-button')).toBeTruthy();
  });

  it('displays the bank transfer image', () => {
    const { getByTestId } = renderWithProvider(<BalanceEmptyState />);

    const image = getByTestId('balance-empty-state-image');
    expect(image).toBeTruthy();
    expect(image.props.source.uri).toBe(
      'http://localhost:3845/assets/380bd6dd5c4ed318751b45ce142a72e476987493.png',
    );
  });

  it('matches snapshot', () => {
    const component = renderWithProvider(<BalanceEmptyState />);
    expect(component).toMatchSnapshot();
  });

  it('matches snapshot with custom props', () => {
    const component = renderWithProvider(
      <BalanceEmptyState
        title="Custom Title"
        subtitle="Custom Subtitle"
        actionText="Custom Action"
        onAction={jest.fn()}
      />,
    );
    expect(component).toMatchSnapshot();
  });
});
