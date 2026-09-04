import React from 'react';
import { CustomAmount } from './custom-amount';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { formatAmountWithLocaleSeparators } from '../../../../../UI/Bridge/utils/formatAmountWithLocaleSeparators';

jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../../../UI/Bridge/utils/formatAmountWithLocaleSeparators');

const mockFormatAmountWithLocaleSeparators = jest.mocked(
  formatAmountWithLocaleSeparators,
);

describe('CustomAmount', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFormatAmountWithLocaleSeparators.mockImplementation((value) => value);
  });

  it('renders amount', () => {
    const { getByText } = renderWithProvider(
      <CustomAmount amountFiat="123.45" />,
    );

    expect(getByText('123.45')).toBeOnTheScreen();
  });

  it('renders the amount formatted with thousand separators', () => {
    mockFormatAmountWithLocaleSeparators.mockImplementation(() => '1,000,000');

    const { getByText } = renderWithProvider(
      <CustomAmount amountFiat="1000000" />,
    );

    expect(mockFormatAmountWithLocaleSeparators).toHaveBeenCalledWith(
      '1000000',
    );
    expect(getByText('1,000,000')).toBeOnTheScreen();
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

    expect(getByTestId('custom-amount-skeleton')).toBeOnTheScreen();
  });

  it('renders the amount even on Max — the input shows the full amount being paid, which is known synchronously and does not wait on quotes', () => {
    const { getByText, queryByTestId } = renderWithProvider(
      <CustomAmount amountFiat="123.45" />,
    );

    expect(getByText('123.45')).toBeOnTheScreen();
    expect(queryByTestId('custom-amount-skeleton')).toBeNull();
  });

  it('renders blinking cursor when showCursor is true', () => {
    const { getByTestId } = renderWithProvider(
      <CustomAmount amountFiat="100" showCursor />,
    );

    expect(getByTestId('custom-amount-cursor')).toBeOnTheScreen();
  });

  it('does not render cursor when showCursor is false', () => {
    const { queryByTestId } = renderWithProvider(
      <CustomAmount amountFiat="100" showCursor={false} />,
    );

    expect(queryByTestId('custom-amount-cursor')).toBeNull();
  });

  it('does not render cursor when disabled', () => {
    const { queryByTestId } = renderWithProvider(
      <CustomAmount amountFiat="100" disabled showCursor />,
    );

    expect(queryByTestId('custom-amount-cursor')).toBeNull();
  });

  it('does not render cursor when loading', () => {
    const { queryByTestId } = renderWithProvider(
      <CustomAmount amountFiat="100" isLoading showCursor />,
    );

    expect(queryByTestId('custom-amount-cursor')).toBeNull();
  });
});
