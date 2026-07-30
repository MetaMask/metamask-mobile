import { AlertKeys } from '../constants/alerts';
import { Alert, Severity } from '../types/alerts';
import { strings } from '../../../../../locales/i18n';
import { formatCustomAmountHelpText } from './formatCustomAmountHelpText';

function alert(partial: {
  key: string;
  message: string;
  title?: string;
}): Alert {
  return {
    severity: Severity.Danger,
    isBlocking: true,
    ...partial,
  };
}

describe('formatCustomAmountHelpText', () => {
  it('returns undefined when no alert', () => {
    expect(formatCustomAmountHelpText(undefined)).toBeUndefined();
  });

  it('formats insufficient token balance as CTA only', () => {
    expect(
      formatCustomAmountHelpText(
        alert({
          key: AlertKeys.InsufficientPayTokenBalance,
          message: 'Insufficient funds',
        }),
      ),
    ).toBe('Insufficient funds');
  });

  it('formats insufficient token balance with title+message as error only', () => {
    expect(
      formatCustomAmountHelpText(
        alert({
          key: AlertKeys.InsufficientPayTokenBalance,
          title: 'Insufficient funds',
          message: 'Enter a lower amount or use a different payment method.',
        }),
      ),
    ).toBe('Enter a lower amount or use a different payment method.');
  });

  it('formats insufficient fees as error only', () => {
    expect(
      formatCustomAmountHelpText(
        alert({
          key: AlertKeys.InsufficientPayTokenFees,
          title: 'Insufficient funds',
          message: 'Enter a lower amount or use a different payment method.',
        }),
      ),
    ).toBe('Enter a lower amount or use a different payment method.');
  });

  it('formats insufficient native as error only', () => {
    expect(
      formatCustomAmountHelpText(
        alert({
          key: AlertKeys.InsufficientPayTokenNative,
          title: 'Insufficient funds',
          message: 'You need ETH for network fees.',
        }),
      ),
    ).toBe('You need ETH for network fees.');
  });

  it('formats no quotes as error only', () => {
    expect(
      formatCustomAmountHelpText(
        alert({
          key: AlertKeys.NoPayTokenQuotes,
          title: 'Route unavailable',
          message: 'No quotes available.',
        }),
      ),
    ).toBe('No quotes available.');
  });

  it('formats deposit in progress as title. message', () => {
    const cta = strings('alert_system.signed_or_submitted_perps_deposit.title');
    const error = strings(
      'alert_system.signed_or_submitted_perps_deposit.message',
    );
    expect(
      formatCustomAmountHelpText(
        alert({
          key: AlertKeys.SignedOrSubmitted,
          title: cta,
          message: error,
        }),
      ),
    ).toBe(`${cta}. ${error}`);
  });

  it('formats pending pay token as error only', () => {
    const error = strings('alert_system.signed_or_submitted_pay_token.message');
    expect(
      formatCustomAmountHelpText(
        alert({
          key: AlertKeys.SignedOrSubmitted,
          title: strings('alert_system.signed_or_submitted_pay_token.title'),
          message: error,
        }),
      ),
    ).toBe(error);
  });

  it('formats perps minimum as CTA only', () => {
    expect(
      formatCustomAmountHelpText(
        alert({
          key: AlertKeys.PerpsDepositMinimum,
          message: 'Minimum $10',
        }),
      ),
    ).toBe('Minimum $10');
  });

  it('formats account no funds as error only', () => {
    expect(
      formatCustomAmountHelpText(
        alert({
          key: AlertKeys.AccountNoFunds,
          title: 'No funds',
          message: 'No funds available. Use a different account.',
        }),
      ),
    ).toBe('No funds available. Use a different account.');
  });

  it('formats headless buy as error only', () => {
    expect(
      formatCustomAmountHelpText(
        alert({
          key: AlertKeys.HeadlessBuyError,
          title: 'Fiat purchase failed',
          message: 'Payment provider unavailable.',
        }),
      ),
    ).toBe('Payment provider unavailable.');
  });
});
