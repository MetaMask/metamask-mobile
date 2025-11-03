import React from 'react';
import { CustomAmount } from './custom-amount';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';

describe('CustomAmount', () => {
  it('renders amount', () => {
    const { getByText } = renderWithProvider(
      <CustomAmount amountFiat="123.45" />,
    );

    expect(getByText('123.45')).toBeOnTheScreen();
  });

  it('renders fiat symbol for specified currency', () => {
    const { getByText } = renderWithProvider(
      <CustomAmount amountFiat="123.45" currency="eur" />,
    );

    expect(getByText('€')).toBeOnTheScreen();
  });

  it('renders selected currency symbol if currency not specified', () => {
    const { getByText } = renderWithProvider(
      <CustomAmount amountFiat="123.45" />,
      { state: otherControllersMock },
    );

    expect(getByText('$')).toBeOnTheScreen();
  });

  it('renders skeleton if loading', () => {
    const { getByTestId } = renderWithProvider(
      <CustomAmount amountFiat="123.45" isLoading />,
    );

    expect(getByTestId('custom-amount-skeleton')).toBeDefined();
  });
});
