import {
  getCrossmintFailureMessage,
  isCrossmintPaymentCompleted,
  parseCrossmintCheckoutMessage,
} from './parseCheckoutMessage';

describe('parseCrossmintCheckoutMessage', () => {
  it('parses a valid checkout message', () => {
    expect(
      parseCrossmintCheckoutMessage(
        JSON.stringify({
          event: 'order:updated',
          data: { order: { orderId: '1', phase: 'delivery' } },
        }),
      ),
    ).toMatchInlineSnapshot(`
      {
        "data": {
          "order": {
            "orderId": "1",
            "phase": "delivery",
          },
        },
        "event": "order:updated",
      }
    `);
  });

  it('returns null for invalid JSON', () => {
    expect(parseCrossmintCheckoutMessage('not-json')).toBeNull();
  });
});

describe('isCrossmintPaymentCompleted', () => {
  it('returns true for completed payment status', () => {
    expect(
      isCrossmintPaymentCompleted({
        orderId: '1',
        payment: { status: 'completed' },
      }),
    ).toBe(true);
  });

  it('returns true for delivery phase', () => {
    expect(
      isCrossmintPaymentCompleted({
        orderId: '1',
        phase: 'delivery',
      }),
    ).toBe(true);
  });

  it('returns false when payment is still pending', () => {
    expect(
      isCrossmintPaymentCompleted({
        orderId: '1',
        phase: 'payment',
        payment: { status: 'awaiting-payment' },
      }),
    ).toBe(false);
  });
});

describe('getCrossmintFailureMessage', () => {
  it('returns creation failure message', () => {
    expect(
      getCrossmintFailureMessage({
        event: 'order:creation-failed',
        data: { message: 'bad order' },
      }),
    ).toBe('bad order');
  });

  it('returns payment failure reason', () => {
    expect(
      getCrossmintFailureMessage({
        event: 'order:updated',
        data: {
          order: {
            orderId: '1',
            payment: { failureReason: { message: 'declined' } },
          },
        },
      }),
    ).toBe('declined');
  });
});
