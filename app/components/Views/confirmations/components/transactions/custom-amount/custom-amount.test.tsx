import React from 'react';
import { CustomAmount } from './custom-amount';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';

describe('CustomAmount', () => {
  it('renders amount', () => {
    const { getByTestId } = renderWithProvider(
      <CustomAmount amountFiat="123.45" />,
    );

    expect(getByTestId('custom-amount-input')).toHaveProp(
      'defaultValue',
      '123.45',
    );
  });

  it('renders fiat symbol for specified currency', () => {
    const { getByTestId } = renderWithProvider(
      <CustomAmount amountFiat="123.45" currency="eur" />,
    );

    expect(getByTestId('custom-amount-symbol')).toHaveProp('defaultValue', '€');
  });

  it('renders selected currency symbol if currency not specified', () => {
    const { getByTestId } = renderWithProvider(
      <CustomAmount amountFiat="123.45" />,
      { state: otherControllersMock },
    );

    expect(getByTestId('custom-amount-symbol')).toHaveProp('defaultValue', '$');
  });

  it('renders skeleton if loading', () => {
    const { getByTestId } = renderWithProvider(
      <CustomAmount amountFiat="123.45" isLoading />,
    );

    expect(getByTestId('custom-amount-skeleton')).toBeDefined();
  });
});
