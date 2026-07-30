import {
  getCrossmintFailureMessage,
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
