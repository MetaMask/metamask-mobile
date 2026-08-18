import React from 'react';
import { CustomAmount } from './custom-amount';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import {
  useIsTransactionPayLoading,
  useTransactionPayIsMaxAmount,
} from '../../../hooks/pay/useTransactionPayData';
import { formatAmountWithLocaleSeparators } from '../../../../../UI/Bridge/utils/formatAmountWithLocaleSeparators';

jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../../../UI/Bridge/utils/formatAmountWithLocaleSeparators');

const mockFormatAmountWithLocaleSeparators = jest.mocked(
  formatAmountWithLocaleSeparators,
);

const mockUseTransactionPayIsMaxAmount = jest.mocked(
  useTransactionPayIsMaxAmount,
);
const mockUseIsTransactionPayLoading = jest.mocked(useIsTransactionPayLoading);

describe('CustomAmount', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseTransactionPayIsMaxAmount.mockReturnValue(false);
    mockUseIsTransactionPayLoading.mockReturnValue(false);
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

  it('renders skeleton when max amount and quotes are loading', () => {
    mockUseTransactionPayIsMaxAmount.mockReturnValue(true);
    mockUseIsTransactionPayLoading.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <CustomAmount amountFiat="123.45" />,
    );

    expect(getByTestId('custom-amount-skeleton')).toBeOnTheScreen();
  });

  it('renders amount when max amount but quotes are not loading', () => {
    mockUseTransactionPayIsMaxAmount.mockReturnValue(true);
    mockUseIsTransactionPayLoading.mockReturnValue(false);

    const { getByText } = renderWithProvider(
      <CustomAmount amountFiat="123.45" />,
    );

    expect(getByText('123.45')).toBeOnTheScreen();
  });

  it('renders amount when quotes are loading but not max amount', () => {
    mockUseTransactionPayIsMaxAmount.mockReturnValue(false);
    mockUseIsTransactionPayLoading.mockReturnValue(true);

    const { getByText } = renderWithProvider(
      <CustomAmount amountFiat="123.45" />,
    );

    expect(getByText('123.45')).toBeOnTheScreen();
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
