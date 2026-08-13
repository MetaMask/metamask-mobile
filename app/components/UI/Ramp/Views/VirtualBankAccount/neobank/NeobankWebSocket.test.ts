import {
  interpretNeobankWsMessage,
  mapNeobankWsMessageToRemoteSnapshot,
} from './NeobankWebSocket';

describe('interpretNeobankWsMessage', () => {
  it('applies register_autoramp_status NormalizedEvents', () => {
    expect(
      interpretNeobankWsMessage({
        eventId: 'evt-1',
        userId: 'customer-1',
        customerId: 'customer-1',
        type: 'register_autoramp_status',
        category: 'autoramp',
        entity: {
          id: 'autoramp-1',
          status: 'Approved',
          needsFetch: false,
        },
      }),
    ).toStrictEqual({
      action: 'apply',
      remote: {
        id: 'autoramp-1',
        customerId: 'customer-1',
        status: 'Approved',
      },
    });
  });

  it('refreshes pointer autoramp events that need a fetch', () => {
    expect(
      interpretNeobankWsMessage({
        eventId: 'autoramp-2',
        userId: 'customer-1',
        customerId: 'customer-1',
        type: 'new_autoramp',
        category: 'autoramp',
        entity: {
          id: 'autoramp-2',
          needsFetch: true,
        },
      }),
    ).toStrictEqual({
      action: 'refresh',
      autorampId: 'autoramp-2',
    });
  });

  it('refreshes deposit_address_created when status is absent', () => {
    expect(
      interpretNeobankWsMessage({
        type: 'deposit_address_created',
        category: 'autoramp',
        customerId: 'customer-1',
        entity: { id: 'autoramp-3', needsFetch: true },
      }),
    ).toStrictEqual({
      action: 'refresh',
      autorampId: 'autoramp-3',
    });
  });

  it('ignores non-autoramp NormalizedEvents', () => {
    expect(
      interpretNeobankWsMessage({
        type: 'transaction_status',
        category: 'transaction',
        customerId: 'customer-1',
        entity: {
          id: 'tx-1',
          transactionStatus: 'Completed',
          needsFetch: false,
        },
      }),
    ).toBeNull();
  });

  it('still maps legacy bare MoonPay autoramp payloads', () => {
    expect(
      mapNeobankWsMessageToRemoteSnapshot({
        id: 'autoramp-9',
        customer_id: 'customer-9',
        status: 'Authorized',
        wallet_address: '0xabc',
      }),
    ).toStrictEqual({
      id: 'autoramp-9',
      customerId: 'customer-9',
      status: 'Authorized',
      walletAddress: '0xabc',
    });
  });
});
