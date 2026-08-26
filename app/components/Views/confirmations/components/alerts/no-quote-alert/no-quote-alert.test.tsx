import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { QuoteErrorInfo } from '@metamask/transaction-pay-controller';
import { NoQuoteAlert } from './no-quote-alert';
import { strings } from '../../../../../../../locales/i18n';

const DETAIL_MOCK = ['reason: INSUFFICIENT_BALANCE', 'required: 100 USDC'];
const COLLAPSED_MESSAGE = strings('alert_system.no_pay_token_quotes.message');

function createError(overrides?: Partial<QuoteErrorInfo>): QuoteErrorInfo {
  return {
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
    const { getByText, queryByText } = render(
      <NoQuoteAlert error={createError()} />,
    );

    expect(getByText(COLLAPSED_MESSAGE)).toBeDefined();
    DETAIL_MOCK.forEach((row) => {
      expect(queryByText(row)).toBeNull();
    });
  });

  it('renders the insufficient balance collapsed message for that reason', () => {
    const insufficientMessage = strings(
      'alert_system.insufficient_pay_method_balance.message',
    );

    const { getByText, queryByText } = render(
      <NoQuoteAlert
        error={createError({ reason: 'insufficient-source-balance' })}
      />,
    );

    expect(getByText(insufficientMessage)).toBeDefined();
    expect(queryByText(COLLAPSED_MESSAGE)).toBeNull();
  });

  it('does not expand after a single tap', () => {
    const { getByTestId, getByText, queryByText } = render(
      <NoQuoteAlert error={createError()} />,
    );

    tap(getByTestId('no-quote-alert'), 1);

    expect(getByText(COLLAPSED_MESSAGE)).toBeDefined();
    DETAIL_MOCK.forEach((row) => {
      expect(queryByText(row)).toBeNull();
    });
  });

  it('expands to show the collapsed message and detail rows after two taps', () => {
    const { getByTestId, getByText } = render(
      <NoQuoteAlert error={createError()} />,
    );

    tap(getByTestId('no-quote-alert'), 2);

    expect(getByText(COLLAPSED_MESSAGE)).toBeDefined();
    DETAIL_MOCK.forEach((row) => {
      expect(getByText(row)).toBeDefined();
    });
  });

  it('collapses again after another two taps', () => {
    const { getByTestId, getByText, queryByText } = render(
      <NoQuoteAlert error={createError()} />,
    );

    const pressable = getByTestId('no-quote-alert');

    tap(pressable, 2);
    DETAIL_MOCK.forEach((row) => {
      expect(getByText(row)).toBeDefined();
    });

    tap(pressable, 2);
    expect(getByText(COLLAPSED_MESSAGE)).toBeDefined();
    DETAIL_MOCK.forEach((row) => {
      expect(queryByText(row)).toBeNull();
    });
  });

  it('shows only the collapsed message when detail is empty', () => {
    const { getByTestId, getByText } = render(
      <NoQuoteAlert error={createError({ detail: [] })} />,
    );

    tap(getByTestId('no-quote-alert'), 2);

    expect(getByText(COLLAPSED_MESSAGE)).toBeDefined();
  });

  it('shows only the collapsed message when detail is undefined', () => {
    const { getByTestId, getByText } = render(
      <NoQuoteAlert error={createError({ detail: undefined })} />,
    );

    tap(getByTestId('no-quote-alert'), 2);

    expect(getByText(COLLAPSED_MESSAGE)).toBeDefined();
  });
});
