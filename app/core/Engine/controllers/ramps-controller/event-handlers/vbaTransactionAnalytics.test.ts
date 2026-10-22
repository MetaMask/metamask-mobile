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
        "destination_amount": "18.00",
        "seconds_since_created": 90,
        "source_amount": "100.00",
        "status": "pending",
        "transaction_id": "tx-1",
        "transaction_status": "FundsReviewInProgress",
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
        ).status,
      ).toBe('pending');
    },
  );

  it('maps a completed status change', () => {
    expect(
      buildMoneyVbaTransactionUpdatedProperties(
        payload('Completed', 'PayoutInProgress'),
        { fiat_code: 'BRL', region: 'BR', vendor: 'iron' },
        NOW,
      ),
    ).toMatchInlineSnapshot(`
      {
        "autoramp_id": "ar-1",
        "destination_amount": "18.00",
        "fiat_code": "BRL",
        "previous_status": "PayoutInProgress",
        "region": "BR",
        "seconds_since_created": 90,
        "source_amount": "100.00",
        "status": "completed",
        "transaction_id": "tx-1",
        "transaction_status": "Completed",
        "vendor": "iron",
      }
    `);
  });

  it.each([
    ['Failed', 'failed'],
    ['RejectedAml', 'rejected_aml'],
    ['RejectedFraud', 'rejected_fraud'],
    ['RejectedMinAmount', 'rejected_min_amount'],
  ])('maps %s to failed with failure_reason %s', (status, failureReason) => {
    expect(
      buildMoneyVbaTransactionUpdatedProperties(
        payload(status, 'PayoutInProgress'),
        {},
        NOW,
      ),
    ).toMatchObject({
      status: 'failed',
      transaction_status: status,
      failure_reason: failureReason,
      previous_status: 'PayoutInProgress',
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
        "status": "completed",
        "transaction_id": "tx-1",
        "transaction_status": "Completed",
      }
    `);
  });

  it('clamps seconds_since_created at zero when createdAt is in the future', () => {
    expect(
      buildMoneyVbaTransactionUpdatedProperties(
        payload('Completed'),
        {},
        Date.parse(CREATED_AT) - 5_000,
      ).seconds_since_created,
    ).toBe(0);
  });

  it('keeps an unmapped raw status and omits status', () => {
    expect(
      buildMoneyVbaTransactionUpdatedProperties(
        payload('SomethingNew', 'Completed'),
        {},
        NOW,
      ),
    ).toMatchInlineSnapshot(`
      {
        "autoramp_id": "ar-1",
        "destination_amount": "18.00",
        "previous_status": "Completed",
        "seconds_since_created": 90,
        "source_amount": "100.00",
        "transaction_id": "tx-1",
        "transaction_status": "SomethingNew",
      }
    `);
  });
});

describe('readVbaTransactionBaseProperties', () => {
  it('reads known VBA base properties and skips an unknown region', () => {
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
          sessionStatus: { finalStatus: 'approved', kycStatus: 'approved' },
        },
        GeolocationController: { location: 'UNKNOWN' },
      }),
    ).toMatchInlineSnapshot(`
      {
        "fiat_code": "USD",
        "kyc_status": "approved",
        "provider_flow_status": "submitted",
        "vendor": "iron",
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
