import { analytics } from '../../../../../util/analytics/analytics';
import Logger from '../../../../../util/Logger';
import ReduxService from '../../../../redux';
import {
  buildMoneyVbaTransactionUpdatedProperties,
  handleAutorampTransactionStatusChangedForMetrics,
  readVbaTransactionBaseProperties,
  type AutorampTransactionStatusChangedPayload,
} from './vbaTransactionAnalytics';

jest.mock('../../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const CREATED_AT = '2026-06-01T00:00:00.000Z';
const NOW = Date.parse(CREATED_AT) + 90_400;

const payload = (
  status: string,
  previousStatus?: string,
): AutorampTransactionStatusChangedPayload => ({
  autorampId: 'ar-1',
  previousStatus,
  transaction: {
    id: 'tx-1',
    autorampId: 'ar-1',
    status,
    sourceAmount: '100.00',
    destinationAmount: '18.00',
    createdAt: CREATED_AT,
  },
});

describe('buildMoneyVbaTransactionUpdatedProperties', () => {
  it('maps a new in-progress transaction and omits previous_status', () => {
    expect(
      buildMoneyVbaTransactionUpdatedProperties(
        payload('FundsReviewInProgress'),
        {},
        NOW,
      ),
    ).toMatchInlineSnapshot(`
      {
        "autoramp_id": "ar-1",
        "autoramp_status": "ready",
        "currency_destination_symbol": "mUSD",
        "destination_amount": 18,
        "entry_point": "add_funds_bank_account",
        "kyc_status": "none",
        "provider_flow_status": "not_started",
        "region": "unknown",
        "seconds_since_created": 90,
        "source_amount": 100,
        "status": "pending",
        "token_chain_id": "eip155:143",
        "transaction_id": "tx-1",
        "transaction_status": "FundsReviewInProgress",
        "vendor": "moonpay",
      }
    `);
  });

  it.each(['ConversionInProgress', 'PayoutInProgress'])(
    'maps %s to pending',
    (status) => {
      expect(
        buildMoneyVbaTransactionUpdatedProperties(
          payload(status, 'FundsReviewInProgress'),
          {},
          NOW,
        )?.status,
      ).toBe('pending');
    },
  );

  it('maps a completed status change', () => {
    expect(
      buildMoneyVbaTransactionUpdatedProperties(
        payload('Completed', 'PayoutInProgress'),
        { currency_source: 'BRL', region: 'br' },
        NOW,
      ),
    ).toMatchInlineSnapshot(`
      {
        "autoramp_id": "ar-1",
        "autoramp_status": "ready",
        "currency_destination_symbol": "mUSD",
        "currency_source": "BRL",
        "destination_amount": 18,
        "entry_point": "add_funds_bank_account",
        "kyc_status": "none",
        "previous_status": "PayoutInProgress",
        "provider_flow_status": "not_started",
        "region": "br",
        "seconds_since_created": 90,
        "source_amount": 100,
        "status": "completed",
        "token_chain_id": "eip155:143",
        "transaction_id": "tx-1",
        "transaction_status": "Completed",
        "vendor": "moonpay",
      }
    `);
  });

  it.each(['Failed', 'RejectedAml', 'RejectedFraud', 'RejectedMinAmount'])(
    'maps %s to failed and keeps the raw status',
    (status) => {
      const properties = buildMoneyVbaTransactionUpdatedProperties(
        payload(status, 'PayoutInProgress'),
        {},
        NOW,
      );

      expect(properties).toMatchObject({
        status: 'failed',
        transaction_status: status,
        previous_status: 'PayoutInProgress',
      });
      expect(properties).not.toHaveProperty('failure_reason');
    },
  );

  it('sends amounts as numbers and omits an amount that is not numeric', () => {
    const properties = buildMoneyVbaTransactionUpdatedProperties(
      {
        autorampId: 'ar-1',
        transaction: {
          id: 'tx-1',
          autorampId: 'ar-1',
          status: 'Completed',
          sourceAmount: '100.50',
          destinationAmount: 'n/a',
        },
      },
      {},
      NOW,
    );

    expect(properties).toMatchObject({ source_amount: 100.5 });
    expect(properties).not.toHaveProperty('destination_amount');
  });

  it('always sends the constant VBA properties the schema requires', () => {
    expect(
      buildMoneyVbaTransactionUpdatedProperties(
        payload('FundsReviewInProgress'),
        {},
        NOW,
      ),
    ).toMatchObject({
      entry_point: 'add_funds_bank_account',
      vendor: 'moonpay',
      autoramp_status: 'ready',
      currency_destination_symbol: 'mUSD',
      token_chain_id: 'eip155:143',
    });
  });

  it('omits amounts and seconds when the summary has no createdAt or amounts', () => {
    expect(
      buildMoneyVbaTransactionUpdatedProperties(
        {
          autorampId: 'ar-1',
          transaction: {
            id: 'tx-1',
            autorampId: 'ar-1',
            status: 'Completed',
          },
        },
        {},
        NOW,
      ),
    ).toMatchInlineSnapshot(`
      {
        "autoramp_id": "ar-1",
        "autoramp_status": "ready",
        "currency_destination_symbol": "mUSD",
        "entry_point": "add_funds_bank_account",
        "kyc_status": "none",
        "provider_flow_status": "not_started",
        "region": "unknown",
        "status": "completed",
        "token_chain_id": "eip155:143",
        "transaction_id": "tx-1",
        "transaction_status": "Completed",
        "vendor": "moonpay",
      }
    `);
  });

  it('clamps seconds_since_created at zero when createdAt is in the future', () => {
    expect(
      buildMoneyVbaTransactionUpdatedProperties(
        payload('Completed'),
        {},
        Date.parse(CREATED_AT) - 5_000,
      ),
    ).toMatchObject({ seconds_since_created: 0 });
  });

  it('returns null when the vendor status is outside the schema', () => {
    expect(
      buildMoneyVbaTransactionUpdatedProperties(
        payload('SomethingNew', 'Completed'),
        {},
        NOW,
      ),
    ).toBeNull();
  });

  it('omits a previous status that is outside the schema', () => {
    expect(
      buildMoneyVbaTransactionUpdatedProperties(
        payload('Completed', 'SomethingNew'),
        {},
        NOW,
      ),
    ).not.toHaveProperty('previous_status');
  });
});

describe('readVbaTransactionBaseProperties', () => {
  it.each([
    ['BR-SP', 'br'],
    ['us', 'us'],
    ['UNKNOWN', 'unknown'],
    ['XX', 'unknown'],
    [undefined, 'unknown'],
  ])('normalizes location %s to region %s', (location, region) => {
    expect(
      readVbaTransactionBaseProperties('ar-1', {
        GeolocationController: { location },
      }).region,
    ).toBe(region);
  });

  it('reads known VBA base properties and reports an unknown region', () => {
    expect(
      readVbaTransactionBaseProperties('ar-1', {
        RampsController: {
          autoramps: [
            {
              id: 'ar-1',
              depositRailsSummary: { currency: 'USD' },
            },
          ],
        },
        KycController: {
          vendor: 'iron',
          providerFlowStatus: 'submitted',
          sessionStatus: { finalStatus: 'approved' },
        },
        GeolocationController: { location: 'UNKNOWN' },
      }),
    ).toMatchInlineSnapshot(`
      {
        "currency_source": "USD",
        "kyc_status": "approved",
        "provider_flow_status": "submitted",
        "region": "unknown",
      }
    `);
  });

  it('returns an empty object when background state is missing', () => {
    expect(readVbaTransactionBaseProperties('ar-1', undefined)).toStrictEqual(
      {},
    );
  });
});

describe('handleAutorampTransactionStatusChangedForMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tracks Money VBA Transaction Updated', () => {
    handleAutorampTransactionStatusChangedForMetrics(
      payload('Completed', 'PayoutInProgress'),
    );

    expect(analytics.trackEvent).toHaveBeenCalledTimes(1);
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Money VBA Transaction Updated',
        properties: buildMoneyVbaTransactionUpdatedProperties(
          payload('Completed', 'PayoutInProgress'),
          {},
          NOW,
        ),
      }),
    );
  });

  it('logs and does not throw when tracking fails', () => {
    jest.mocked(analytics.trackEvent).mockImplementation(() => {
      throw new Error('analytics down');
    });

    expect(() =>
      handleAutorampTransactionStatusChangedForMetrics(payload('Failed')),
    ).not.toThrow();
    expect(Logger.error).toHaveBeenCalled();
  });

  it('does not track a vendor status outside the schema', () => {
    handleAutorampTransactionStatusChangedForMetrics(payload('SomethingNew'));

    expect(analytics.trackEvent).not.toHaveBeenCalled();
  });

  it('does not throw when the redux store is unavailable', () => {
    const store = Object.getOwnPropertyDescriptor(ReduxService, 'store');
    Object.defineProperty(ReduxService, 'store', {
      configurable: true,
      get() {
        throw new Error('Redux store does not exist!');
      },
    });

    expect(() =>
      handleAutorampTransactionStatusChangedForMetrics(payload('Completed')),
    ).not.toThrow();
    expect(analytics.trackEvent).toHaveBeenCalledTimes(1);

    if (store) {
      Object.defineProperty(ReduxService, 'store', store);
    }
  });
});
