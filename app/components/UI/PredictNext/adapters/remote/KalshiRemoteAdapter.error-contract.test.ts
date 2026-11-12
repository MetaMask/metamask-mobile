import contract from '../../contracts/v1/fixtures/api-errors.v1.json';
import { PredictErrorCode } from '../../errors';
import { predictErrorEvidence, type PredictErrorPhase } from '../../errors/apiErrorEvidence';
import type { PredictEntityId } from '../../types';
import { KalshiRemoteAdapter } from './KalshiRemoteAdapter';
import {
  PredictHttpError,
  PredictReadBudgetExhaustedError,
  PredictRequestNotSentError,
  PredictSigningError,
  type PredictApiReadTransport,
} from './PredictApiReadClient';
import {
  VenueReadBudgetExhaustedError,
  VenueSigningUnavailableError,
} from './signedVenueCall';

// Deliberate consumer decisions, not a second emitted-code inventory: the API
// artifact supplies every case, and an unrecognized addition fails this table.
const PRODUCT_CODE_BY_API_CODE: Record<string, PredictErrorCode | undefined> = {
  market_not_found: PredictErrorCode.MARKET_NOT_FOUND,
  market_not_tradeable: PredictErrorCode.MARKET_NOT_TRADEABLE,
  quote_unavailable: PredictErrorCode.QUOTE_UNAVAILABLE,
  balance_unavailable: PredictErrorCode.BALANCE_UNAVAILABLE,
  position_unavailable: PredictErrorCode.POSITION_UNAVAILABLE,
  insufficient_liquidity: PredictErrorCode.INSUFFICIENT_LIQUIDITY,
  insufficient_balance: PredictErrorCode.INSUFFICIENT_BALANCE,
  insufficient_position: PredictErrorCode.INSUFFICIENT_POSITION,
  preview_not_found: PredictErrorCode.ORDER_NOT_FOUND,
  preview_expired: PredictErrorCode.PREVIEW_EXPIRED,
  venue_unavailable: PredictErrorCode.VENUE_UNAVAILABLE,
  venue_preview_mismatch: PredictErrorCode.ORDER_PREVIEW_MISMATCH,
  operation_not_found: PredictErrorCode.ORDER_OUTCOME_UNKNOWN,
  venue_authorization_malformed: PredictErrorCode.VENUE_SIGNING_REFUSED,
  venue_authorization_required: PredictErrorCode.UNAUTHENTICATED,
  venue_authorization_invalid: PredictErrorCode.UNAUTHENTICATED,
  venue_signature_expired: PredictErrorCode.VENUE_SIGNING_REFUSED,
  venue_step_changed: PredictErrorCode.VENUE_SIGNING_REFUSED,
  venue_account_not_enabled: PredictErrorCode.VENUE_ACCOUNT_NOT_ENABLED,
  venue_auth_rejected: PredictErrorCode.UNAUTHENTICATED,
  venue_profile_update_required: PredictErrorCode.APP_UPDATE_REQUIRED,
  invalid_request: PredictErrorCode.INVALID_RESPONSE,
  unauthorized: PredictErrorCode.UNAUTHENTICATED,
  venue_not_found: PredictErrorCode.UNSUPPORTED_VENUE,
  rate_limited: PredictErrorCode.RATE_LIMITED,
  venue_profile_not_ready: PredictErrorCode.VENUE_UNAVAILABLE,
};

const invoke = (phase: PredictErrorPhase, error: PredictHttpError) => {
  const reject = jest.fn().mockRejectedValue(error);
  const client = {
    fetchOrderPreview: reject,
    commitOrder: reject,
    observeOrder: reject,
    fetchBalance: reject,
  } as unknown as PredictApiReadTransport;
  const adapter = new KalshiRemoteAdapter(client);
  switch (phase) {
    case 'preview':
      return adapter.trading.previewOrder({
        marketId: 'market-1' as PredictEntityId,
        side: 'yes',
        action: 'buy',
        amount: '1.00',
        idempotencyKey: '0195dbde-a21b-4000-8000-000000000001',
      });
    case 'commit':
      return adapter.trading.commitOrder('preview-1', { inputs: {}, values: {} });
    case 'observe':
      return adapter.trading.observeOrder('preview-1');
    case 'signed_read':
      return adapter.portfolio.fetchBalance();
  }
};

const cases = Object.entries(contract.codes).flatMap(([code, definition]) =>
  definition.phases.map((phase) => ({ code, phase, definition })),
);

describe('API emitted error contract at the mobile adapter boundary', () => {
  it.each(cases)('$phase maps $code with API relay evidence', async ({ code, phase, definition }) => {
    const expected = PRODUCT_CODE_BY_API_CODE[code];
    expect(expected).toBeDefined();
    const commitRelay = 'commitRelay' in definition ? definition.commitRelay : 'unknown';
    await expect(invoke(phase as PredictErrorPhase, new PredictHttpError(definition.status, code))).rejects.toMatchObject({
      code: expected,
      metadata: {
        status: definition.status,
        bodyCode: code,
        phase,
        mutationRelay:
          phase === 'commit'
            ? commitRelay
            : contract.phaseRelay[phase as PredictErrorPhase],
        operationOutcome: contract.operationOutcome,
      },
    });
  });

  it.each([
    [403, 'venue_preview_mismatch', PredictErrorCode.ORDER_PREVIEW_MISMATCH],
    [403, 'venue_authorization_invalid', PredictErrorCode.UNAUTHENTICATED],
    [403, 'venue_auth_rejected', PredictErrorCode.UNAUTHENTICATED],
    [403, 'geo_blocked', PredictErrorCode.GEO_BLOCKED],
    [451, undefined, PredictErrorCode.GEO_BLOCKED],
    [403, 'unrecognized_future_error', PredictErrorCode.INVALID_RESPONSE],
    [403, undefined, PredictErrorCode.INVALID_RESPONSE],
    [503, 'venue_profile_update_required', PredictErrorCode.APP_UPDATE_REQUIRED],
    [409, 'venue_profile_not_ready', PredictErrorCode.VENUE_UNAVAILABLE],
  ])('maps status %s code %s without inventing geography', async (status, code, expected) => {
    await expect(invoke('commit', new PredictHttpError(status as number, code as string | undefined))).rejects.toMatchObject({ code: expected });
  });

  it.each([
    ['venue_signing_unavailable', PredictErrorCode.UNAUTHENTICATED],
    ['venue_signing_refused', PredictErrorCode.VENUE_SIGNING_REFUSED],
  ])('keeps local %s honest and unsent only on the mutation lane', async (code, expected) => {
    for (const phase of ['commit', 'observe'] as const) {
      await expect(invoke(phase, new PredictRequestNotSentError(code))).rejects.toMatchObject({
        code: expected,
        metadata: {
          requestSent: false,
          phase,
          mutationRelay: phase === 'commit' ? 'not_relayed_this_invocation' : 'not_a_mutation',
          operationOutcome: 'unknown',
        },
      });
    }
  });

  it.each(contract.uncodedStatuses)('never resolves an operation from uncoded HTTP %s', async (status) => {
    await expect(invoke('commit', new PredictHttpError(status))).rejects.toMatchObject({
      metadata: { mutationRelay: 'unknown', operationOutcome: 'unknown' },
    });
    await expect(invoke('observe', new PredictHttpError(status))).rejects.toMatchObject({
      metadata: { mutationRelay: 'not_a_mutation', operationOutcome: 'unknown' },
    });
  });

  it.each([
    [new PredictSigningError(new VenueSigningUnavailableError(true)), PredictErrorCode.UNAUTHENTICATED],
    [new PredictReadBudgetExhaustedError(new VenueReadBudgetExhaustedError()), PredictErrorCode.VENUE_UNAVAILABLE],
  ] as const)('preserves sentness after a read already dispatched: %s', async (error, code) => {
    await expect(invoke('observe', error)).rejects.toMatchObject({
      code,
      metadata: {
        requestSent: true,
        phase: 'observe',
        mutationRelay: 'not_a_mutation',
        operationOutcome: 'unknown',
      },
    });
  });

  it('never reuses commit-only mismatch or absence proof during observation', () => {
    for (const code of ['venue_preview_mismatch', 'operation_not_found', 'preview_expired']) {
      expect(predictErrorEvidence('observe', code)).toEqual({
        phase: 'observe', mutationRelay: 'not_a_mutation', operationOutcome: 'unknown',
      });
    }
  });
});
