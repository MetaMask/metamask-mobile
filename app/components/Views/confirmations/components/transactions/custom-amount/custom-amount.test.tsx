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

  describe('display-only decimal rounding', () => {
    it('rounds full-precision amounts down to two decimals', () => {
      const { getByText } = renderWithProvider(
        <CustomAmount amountFiat="500.123456" />,
      );

      expect(getByText('500.12')).toBeOnTheScreen();
    });

    it('rounds half up', () => {
      const { getByText } = renderWithProvider(
        <CustomAmount amountFiat="10.375107" />,
      );

      expect(getByText('10.38')).toBeOnTheScreen();
    });

    it('rounds up and carries into the whole part', () => {
      const { getByText } = renderWithProvider(
        <CustomAmount amountFiat="1.999" />,
      );

      expect(getByText('2.00')).toBeOnTheScreen();
    });

    it('rounds before applying locale separators', () => {
      renderWithProvider(<CustomAmount amountFiat="1234.987654" />);

      expect(mockFormatAmountWithLocaleSeparators).toHaveBeenCalledWith(
        '1234.99',
      );
    });

    it('normalises a comma decimal separator to a period', () => {
      // formatAmountWithLocaleSeparators splits on `.` and applies the locale
      // separator itself, so handing it a comma would drop the decimals.
      const { getByText } = renderWithProvider(
        <CustomAmount amountFiat="500,987654" />,
      );

      expect(getByText('500.99')).toBeOnTheScreen();
    });

    it('renders malformed input unchanged rather than NaN', () => {
      const { getByText } = renderWithProvider(
        <CustomAmount amountFiat="1.2.3456" />,
      );

      expect(getByText('1.2.3456')).toBeOnTheScreen();
    });

    it.each(['500', '1000000', '123.45', '123.4', '0.10', '12.'])(
      'leaves keypad input %s exactly as typed',
      (amountFiat) => {
        const { getByText } = renderWithProvider(
          <CustomAmount amountFiat={amountFiat} />,
        );

        expect(getByText(amountFiat)).toBeOnTheScreen();
      },
    );
  });
});
