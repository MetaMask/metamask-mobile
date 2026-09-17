import {
  getCrossmintFailureMessage,
  isCrossmintPaymentCompleted,
  isCrossmintPaymentInProgress,
  parseCrossmintCheckoutMessage,
} from './crossmintCheckoutMessage';

describe('parseCrossmintCheckoutMessage', () => {
  it('parses a valid checkout message', () => {
    const message = parseCrossmintCheckoutMessage(
      JSON.stringify({ event: 'order:updated', data: {} }),
    );
    expect(message).toEqual({ event: 'order:updated', data: {} });
  });

  it('returns null for non-JSON payloads', () => {
    expect(parseCrossmintCheckoutMessage('not-json')).toBeNull();
  });

  it('returns null when the event field is missing', () => {
    expect(
      parseCrossmintCheckoutMessage(JSON.stringify({ foo: 1 })),
    ).toBeNull();
  });

  it('returns null for non-object payloads', () => {
    expect(parseCrossmintCheckoutMessage('null')).toBeNull();
  });
});

describe('getCrossmintFailureMessage', () => {
  it('returns the message for order creation failures', () => {
    expect(
      getCrossmintFailureMessage({
        event: 'order:creation-failed',
        data: { message: 'Order limit exceeded' },
      }),
    ).toBe('Order limit exceeded');
  });

  it('falls back to a default for creation failures without a message', () => {
    expect(getCrossmintFailureMessage({ event: 'order:creation-failed' })).toBe(
      'Order creation failed',
    );
  });

  it('returns the payment failure reason', () => {
    expect(
      getCrossmintFailureMessage({
        event: 'order:updated',
        data: {
          order: {
            payment: {
              status: 'failed',
              failureReason: { message: 'Card declined' },
            },
          },
        },
      }),
    ).toBe('Card declined');
  });

  it('returns the quote unavailability reason', () => {
    expect(
      getCrossmintFailureMessage({
        event: 'order:updated',
        data: {
          order: {
            lineItems: [
              { quote: { unavailabilityReason: { message: 'No liquidity' } } },
            ],
          },
        },
      }),
    ).toBe('No liquidity');
  });

  it('returns null when there is no failure', () => {
    expect(
      getCrossmintFailureMessage({ event: 'order:updated', data: {} }),
    ).toBeNull();
  });
});

describe('isCrossmintPaymentCompleted', () => {
  it('is true when the payment status is completed', () => {
    expect(
      isCrossmintPaymentCompleted({ payment: { status: 'completed' } }),
    ).toBe(true);
  });

  it('is true for delivery and completed phases', () => {
    expect(isCrossmintPaymentCompleted({ phase: 'delivery' })).toBe(true);
    expect(isCrossmintPaymentCompleted({ phase: 'completed' })).toBe(true);
  });

  it('is false before payment and without an order', () => {
    expect(
      isCrossmintPaymentCompleted({ payment: { status: 'awaiting-payment' } }),
    ).toBe(false);
    expect(isCrossmintPaymentCompleted(undefined)).toBe(false);
  });
});

describe('isCrossmintPaymentInProgress', () => {
  it('is true while payment settles', () => {
    expect(
      isCrossmintPaymentInProgress({ payment: { status: 'in-progress' } }),
    ).toBe(true);
    expect(
      isCrossmintPaymentInProgress({
        payment: { status: 'crypto-payouts-in-progress' },
      }),
    ).toBe(true);
  });

  it('is false once completed, before payment, and without an order', () => {
    expect(
      isCrossmintPaymentInProgress({ payment: { status: 'completed' } }),
    ).toBe(false);
    expect(
      isCrossmintPaymentInProgress({ payment: { status: 'awaiting-payment' } }),
    ).toBe(false);
    expect(isCrossmintPaymentInProgress(undefined)).toBe(false);
  });
});
