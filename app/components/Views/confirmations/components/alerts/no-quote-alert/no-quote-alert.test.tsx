import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { QuoteErrorInfo } from '@metamask/transaction-pay-controller';
import { NoQuoteAlert } from './no-quote-alert';
import { strings } from '../../../../../../../locales/i18n';

const ERROR_MESSAGE_MOCK = 'Insufficient balance for this route';
const DETAIL_MOCK = ['reason: INSUFFICIENT_BALANCE', 'required: 100 USDC'];
const COLLAPSED_MESSAGE = strings('alert_system.no_pay_token_quotes.message');

function createError(overrides?: Partial<QuoteErrorInfo>): QuoteErrorInfo {
  return {
    message: ERROR_MESSAGE_MOCK,
    detail: DETAIL_MOCK,
    ...overrides,
  } as QuoteErrorInfo;
}

function tap(target: Parameters<typeof fireEvent.press>[0], times: number) {
  for (let i = 0; i < times; i++) {
    fireEvent.press(target);
  }
}

describe('NoQuoteAlert', () => {
  it('renders the generic collapsed message by default', () => {
    const { getByText, queryByText, queryByTestId } = render(
      <NoQuoteAlert error={createError()} />,
    );

    expect(getByText(COLLAPSED_MESSAGE)).toBeDefined();
    expect(queryByText(ERROR_MESSAGE_MOCK)).toBeNull();
    expect(queryByTestId('no-quote-alert-details')).toBeNull();
  });

  it('does not expand after a single tap', () => {
    const { getByText, queryByText, queryByTestId } = render(
      <NoQuoteAlert error={createError()} />,
    );

    tap(getByText(COLLAPSED_MESSAGE), 1);

    expect(getByText(COLLAPSED_MESSAGE)).toBeDefined();
    expect(queryByText(ERROR_MESSAGE_MOCK)).toBeNull();
    expect(queryByTestId('no-quote-alert-details')).toBeNull();
  });

  it('expands to show the error message and detail rows after two taps', () => {
    const { getByText, queryByText, getByTestId } = render(
      <NoQuoteAlert error={createError()} />,
    );

    tap(getByText(COLLAPSED_MESSAGE), 2);

    expect(getByText(ERROR_MESSAGE_MOCK)).toBeDefined();
    expect(queryByText(COLLAPSED_MESSAGE)).toBeNull();
    expect(getByTestId('no-quote-alert-details')).toBeDefined();
    DETAIL_MOCK.forEach((row) => {
      expect(getByText(row)).toBeDefined();
    });
  });

  it('expands the message but omits the details block when detail is empty', () => {
    const { getByText, queryByTestId } = render(
      <NoQuoteAlert error={createError({ detail: [] })} />,
    );

    tap(getByText(COLLAPSED_MESSAGE), 2);

    expect(getByText(ERROR_MESSAGE_MOCK)).toBeDefined();
    expect(queryByTestId('no-quote-alert-details')).toBeNull();
  });

  it('omits the details block when detail is undefined', () => {
    const { getByText, queryByTestId } = render(
      <NoQuoteAlert error={createError({ detail: undefined })} />,
    );

    tap(getByText(COLLAPSED_MESSAGE), 2);

    expect(getByText(ERROR_MESSAGE_MOCK)).toBeDefined();
    expect(queryByTestId('no-quote-alert-details')).toBeNull();
  });
});
