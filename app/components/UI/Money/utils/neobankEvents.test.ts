import {
  DEMO_NEOBANK_CUSTOMER_ID,
  getNeobankEventsUrl,
  isCompletedNeobankDeposit,
  parseNeobankEvent,
  resolveNeobankDemoCustomerId,
} from './neobankEvents';

describe('neobankEvents', () => {
  const completedEvent = {
    eventId: 'event-1',
    type: 'transaction_status',
    payload: {
      data: {
        message: {
          TransactionStatus: {
            id: 'iron-sandbox-uuid',
            transaction_status: 'Completed',
          },
        },
      },
    },
  };

  describe('parseNeobankEvent', () => {
    it('parses a valid event', () => {
      expect(parseNeobankEvent(JSON.stringify(completedEvent))).toStrictEqual(
        completedEvent,
      );
    });

    it.each([undefined, null, 1, '{invalid'])(
      'returns null for malformed data: %p',
      (value) => {
        expect(parseNeobankEvent(value)).toBeNull();
      },
    );
  });

  describe('isCompletedNeobankDeposit', () => {
    it('accepts a Completed transaction status event', () => {
      expect(isCompletedNeobankDeposit(completedEvent)).toBe(true);
    });

    it('rejects non-completed and unrelated events', () => {
      expect(
        isCompletedNeobankDeposit({
          ...completedEvent,
          type: 'customer_status',
        }),
      ).toBe(false);
      expect(
        isCompletedNeobankDeposit({
          ...completedEvent,
          payload: {
            data: {
              message: {
                TransactionStatus: {
                  transaction_status: 'PayoutInProgress',
                },
              },
            },
          },
        }),
      ).toBe(false);
    });
  });

  describe('resolveNeobankDemoCustomerId', () => {
    it('prefers the persisted moonpay customer id', () => {
      expect(resolveNeobankDemoCustomerId('real-customer')).toBe(
        'real-customer',
      );
    });

    // The `NEOBANK_DEMO_CUSTOMER_ID` env override is inlined by Babel's
    // `transform-inline-environment-variables` at transform time, so a runtime
    // override cannot be exercised here. When it is unset (the common case,
    // including George's demo build), the resolver returns the hardcoded id.
    it.each([null, undefined, ''])(
      'falls back to the demo id when moonpayCustomerId is %p',
      (value) => {
        expect(resolveNeobankDemoCustomerId(value)).toBe(
          DEMO_NEOBANK_CUSTOMER_ID,
        );
      },
    );
  });

  describe('getNeobankEventsUrl', () => {
    it('uses the dev proxy and safely encodes the customer id', () => {
      expect(getNeobankEventsUrl('customer/a b')).toBe(
        'wss://on-ramp.dev-api.cx.metamask.io/neobank/events?userId=customer%2Fa%20b',
      );
    });
  });
});
