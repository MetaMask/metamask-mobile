import {
  composePredictPortfolioSummary,
  parsePredictActivityPage,
  parsePredictBalance,
  parsePredictPositionsPage,
} from '../../contracts/v1/portfolio';
import {
  parsePredictOrderPreview,
  parsePredictOrderReceipt,
  parsePredictUnresolvedOrdersPage,
} from '../../contracts/v1/trading';
import {
  parsePredictDepositOperation,
  parsePredictDepositStart,
  parsePredictOpenDeposits,
  parsePredictWithdrawPreview,
  parsePredictWithdrawReceipt,
} from '../../contracts/v1/funding';
import {
  parsePredictEvent,
  parsePredictFeed,
  parsePredictMarketHistory,
  parsePredictSearchResults,
  parsePredictVenueStatus,
} from '../../contracts/v1/marketData';
import { parsePredictVenueCatalog } from '../../contracts/v1/venueCatalog';
import { PredictError, PredictErrorCode } from '../../errors';
import {
  predictErrorEvidence,
  type PredictErrorPhase,
  type PredictRouteRefusals,
} from '../../errors/apiErrorEvidence';
import type {
  FetchOrderPreviewParams,
  PredictDepositOperation,
  PredictOrderReview,
  PredictVenueId,
  PredictWithdrawReceipt,
} from '../../types';
import type { SignOperationInput } from '../../auth/signing/signOperationTypes';
import type { InvariantDisplay } from '../../auth/signing/profileTemplates';
import {
  kalshiOrderSigningInput,
  loadFeeCeilingCentsPerContract,
  type KalshiOrderSigningInput,
} from './kalshiOrderSigning';
import {
  depositAmountCents,
  isValidDepositParams,
  kalshiDepositSigningInputs,
} from './kalshiDepositSigning';
import type {
  VenueFundingAdapter,
  VenueMarketDataAdapter,
  VenuePortfolioAdapter,
  VenueTradingAdapter,
} from '../types';
import {
  type PredictApiReadTransport,
  PredictHttpError,
} from './PredictApiReadClient';

/** Canonical codes win over HTTP status, including authorization 403s. */
const ERROR_CODE_BY_BACKEND_CODE: Record<string, PredictErrorCode | undefined> =
  {
    operation_not_found: PredictErrorCode.ORDER_OUTCOME_UNKNOWN,
    preview_not_found: PredictErrorCode.ORDER_NOT_FOUND,
    market_not_found: PredictErrorCode.MARKET_NOT_FOUND,
    market_not_tradeable: PredictErrorCode.MARKET_NOT_TRADEABLE,
    quote_unavailable: PredictErrorCode.QUOTE_UNAVAILABLE,
    preview_expired: PredictErrorCode.PREVIEW_EXPIRED,
    balance_unavailable: PredictErrorCode.BALANCE_UNAVAILABLE,
    insufficient_balance: PredictErrorCode.INSUFFICIENT_BALANCE,
    insufficient_liquidity: PredictErrorCode.INSUFFICIENT_LIQUIDITY,
    insufficient_position: PredictErrorCode.INSUFFICIENT_POSITION,
    position_unavailable: PredictErrorCode.POSITION_UNAVAILABLE,
    venue_unavailable: PredictErrorCode.VENUE_UNAVAILABLE,
    venue_preview_mismatch: PredictErrorCode.ORDER_PREVIEW_MISMATCH,
    client_order_id_conflict: PredictErrorCode.ORDER_PREVIEW_MISMATCH,
    venue_authorization_malformed: PredictErrorCode.VENUE_SIGNING_REFUSED,
    venue_authorization_required: PredictErrorCode.UNAUTHENTICATED,
    venue_authorization_invalid: PredictErrorCode.UNAUTHENTICATED,
    venue_signature_expired: PredictErrorCode.VENUE_SIGNING_REFUSED,
    venue_step_changed: PredictErrorCode.VENUE_SIGNING_REFUSED,
    venue_account_not_enabled: PredictErrorCode.VENUE_ACCOUNT_NOT_ENABLED,
    venue_auth_rejected: PredictErrorCode.UNAUTHENTICATED,
    venue_signing_unavailable: PredictErrorCode.UNAUTHENTICATED,
    venue_signing_refused: PredictErrorCode.VENUE_SIGNING_REFUSED,
    venue_read_budget_exhausted: PredictErrorCode.VENUE_UNAVAILABLE,
    venue_profile_update_required: PredictErrorCode.APP_UPDATE_REQUIRED,
    venue_profile_not_ready: PredictErrorCode.VENUE_UNAVAILABLE,
    geo_blocked: PredictErrorCode.GEO_BLOCKED,
    amount_below_minimum: PredictErrorCode.AMOUNT_BELOW_MINIMUM,
    invalid_request: PredictErrorCode.INVALID_RESPONSE,
    unauthorized: PredictErrorCode.UNAUTHENTICATED,
    venue_not_found: PredictErrorCode.UNSUPPORTED_VENUE,
    rate_limited: PredictErrorCode.RATE_LIMITED,
    // Only the deposit routes answer these.
    client_operation_id_conflict: PredictErrorCode.DEPOSIT_MISMATCH,
    deposit_in_progress: PredictErrorCode.DEPOSIT_IN_PROGRESS,
    deposit_not_cancellable: PredictErrorCode.DEPOSIT_NOT_CANCELLABLE,
    amount_rejected: PredictErrorCode.DEPOSIT_AMOUNT_REJECTED,
    deposit_rejected: PredictErrorCode.DEPOSIT_FAILED,
    deposit_address_invalid: PredictErrorCode.DEPOSIT_FAILED,
    address_request_lost: PredictErrorCode.DEPOSIT_FAILED,
  };

/** Where the deposit routes read a shared code differently from the Order
 * routes. A deposit has no Preview or Order outcome to speak of. */
const FUNDING_ERROR_CODE_BY_BACKEND_CODE: Record<
  string,
  PredictErrorCode | undefined
> = {
  operation_not_found: PredictErrorCode.DEPOSIT_NOT_FOUND,
  venue_preview_mismatch: PredictErrorCode.DEPOSIT_MISMATCH,
};

/** How one route reads the backend's codes: the product code where it
 * differs from {@link ERROR_CODE_BY_BACKEND_CODE}, and the codes it refuses
 * before it stores or relays anything. */
interface RouteErrorReading {
  codes: Record<string, PredictErrorCode | undefined>;
  refusedBeforeRelay?: PredictRouteRefusals;
}

/** The deposit reads and the deposit create. */
const FUNDING_ROUTE: RouteErrorReading = {
  codes: FUNDING_ERROR_CODE_BY_BACKEND_CODE,
};

/** Cancel looks the deposit up before it changes it, so a missing deposit
 * means nothing was stored. */
const DEPOSIT_CANCEL_ROUTE: RouteErrorReading = {
  codes: FUNDING_ERROR_CODE_BY_BACKEND_CODE,
  refusedBeforeRelay: { operation_not_found: true },
};

/** The transfer report refuses each of these before it stores the hash or
 * calls the venue. Each transfer code means the reported transfer does not
 * fit this deposit: another chain, a hash the backend refuses, another hash
 * than the one it has, a hash another deposit holds, or a deposit that takes
 * no transfer. Only this route answers them. */
const DEPOSIT_TRANSFER_ROUTE: RouteErrorReading = {
  codes: {
    ...FUNDING_ERROR_CODE_BY_BACKEND_CODE,
    transfer_chain_mismatch: PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH,
    transfer_hash_invalid: PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH,
    transfer_hash_mismatch: PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH,
    transfer_hash_reused: PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH,
    transfer_not_expected: PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH,
  },
  refusedBeforeRelay: {
    operation_not_found: true,
    transfer_chain_mismatch: true,
    transfer_hash_invalid: true,
    transfer_hash_mismatch: true,
    transfer_hash_reused: true,
    transfer_not_expected: true,
  },
};

const isAbortError = (error: unknown): error is Error =>
  error instanceof Error && error.name === 'AbortError';

/**
 * Compares two canonical decimal amounts by value: the backend echoes the
 * requested amount normalized to two decimals, so '20' and '20.00' are the
 * same amount and a naive string compare would reject valid echoes.
 */
const isSameAmount = (left: string, right: string): boolean =>
  left.replace(/(\.\d*?)0+$/u, '$1').replace(/\.$/u, '') ===
  right.replace(/(\.\d*?)0+$/u, '$1').replace(/\.$/u, '');

/**
 * Keeps the HTTP status and the backend's canonical code for diagnosis.
 * Never the response body.
 */
const toHttpErrorMetadata = (
  error: PredictHttpError,
  phase: PredictErrorPhase,
  routeRefusals?: PredictRouteRefusals,
): Record<string, unknown> => ({
  status: error.status,
  ...(error.bodyCode === undefined ? {} : { bodyCode: error.bodyCode }),
  ...(error.requestSent === undefined
    ? {}
    : { requestSent: error.requestSent }),
  ...predictErrorEvidence(
    phase,
    error.bodyCode,
    error.requestSent,
    routeRefusals,
  ),
});

/**
 * The last resort when the backend sent no canonical code. 403 is also used
 * for authorization and unknown coded failures, so only an explicit 451 is
 * a region restriction: never invent one from 403.
 */
const codeForHttpStatus = (status: number): PredictErrorCode => {
  if (status === 401) {
    return PredictErrorCode.UNAUTHENTICATED;
  }
  if (status === 451) {
    return PredictErrorCode.GEO_BLOCKED;
  }
  if (status === 429) {
    return PredictErrorCode.RATE_LIMITED;
  }
  if (status === 503) {
    return PredictErrorCode.VENUE_UNAVAILABLE;
  }
  return status >= 500
    ? PredictErrorCode.NETWORK_ERROR
    : PredictErrorCode.INVALID_RESPONSE;
};

const mapError = (
  error: unknown,
  phase: PredictErrorPhase = 'signed_read',
  route: RouteErrorReading = { codes: {} },
): never => {
  if (isAbortError(error) || error instanceof PredictError) {
    throw error;
  }

  if (error instanceof TypeError) {
    throw PredictError.from(PredictErrorCode.NETWORK_ERROR);
  }

  if (error instanceof PredictHttpError) {
    const metadata = toHttpErrorMetadata(
      error,
      phase,
      route.refusedBeforeRelay,
    );
    const mapped = error.bodyCode
      ? (route.codes[error.bodyCode] ??
        ERROR_CODE_BY_BACKEND_CODE[error.bodyCode])
      : undefined;
    throw PredictError.from(mapped ?? codeForHttpStatus(error.status), {
      metadata,
    });
  }

  throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
};

/** Kalshi's Venue ID. Only Kalshi's adapter and its composition name it;
 * every other caller takes the Venue from the Active Venue, a route, or an
 * intent. */
export const KALSHI_VENUE_ID = 'kalshi' as PredictVenueId;

/** Parses a receipt and re-checks the ownership the parser cannot know: a
 * response must describe the Preview this session asked about, in this
 * Venue. Both the Commit and the receipt read go through it, so the two can
 * never drift apart. */
const parseOwnWithdrawReceipt = (
  value: unknown,
  venueId: PredictVenueId,
  previewId: string,
): PredictWithdrawReceipt => {
  const receipt = parsePredictWithdrawReceipt(value);
  if (receipt.venueId !== venueId || receipt.previewId !== previewId) {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
  return receipt;
};

export interface KalshiOrderSigningDependencies {
  getApprovalGeneration: () => number | undefined;
  /** Order review only. A deposit has no invariant figures to preview. */
  previewOperation?: (
    intent: 'order.place',
    input: SignOperationInput,
  ) => Promise<InvariantDisplay | undefined>;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const TRANSACTION_HASH = /^0x[0-9a-fA-F]{64}$/u;

/** A deposit call this invocation refused locally: nothing was sent. */
const unsentFundingError = (code: PredictErrorCode): PredictError =>
  PredictError.from(code, {
    metadata: {
      phase: 'commit',
      mutationRelay: 'not_relayed_this_invocation',
      operationOutcome: 'unknown',
    },
  });

/** Money is compared in cents: '25.5' and '25.50' are one amount. */
const isSameDepositAmount = (left: string, right: string): boolean => {
  const cents = depositAmountCents(left);
  return cents !== undefined && cents === depositAmountCents(right);
};

interface PinnedOrderPreview {
  expiresAt: number;
  approvalGeneration: number | undefined;
  signing: KalshiOrderSigningInput | undefined;
  snapshot: string;
  review?: PredictOrderReview;
}

const MAX_PINNED_PREVIEWS = 32;

export class KalshiRemoteAdapter {
  readonly venueId = KALSHI_VENUE_ID;
  readonly marketData: VenueMarketDataAdapter;
  readonly portfolio: VenuePortfolioAdapter;
  readonly trading: VenueTradingAdapter;
  readonly funding: VenueFundingAdapter;
  readonly #previews = new Map<string, PinnedOrderPreview>();
  #previewGeneration = 0;

  constructor(
    client: PredictApiReadTransport,
    signing?: KalshiOrderSigningDependencies,
  ) {
    const currentPreview = (previewId: string): PinnedOrderPreview => {
      const pinned = this.#previews.get(previewId);
      if (!pinned || pinned.expiresAt <= Date.now()) {
        this.#previews.delete(previewId);
        throw PredictError.from(PredictErrorCode.PREVIEW_EXPIRED, {
          metadata: {
            phase: 'commit',
            mutationRelay: 'not_relayed_this_invocation',
          },
        });
      }
      if (
        pinned.approvalGeneration === undefined ||
        pinned.approvalGeneration !== signing?.getApprovalGeneration()
      ) {
        this.#previews.delete(previewId);
        throw PredictError.from(PredictErrorCode.UNAUTHENTICATED, {
          metadata: {
            phase: 'commit',
            mutationRelay: 'not_relayed_this_invocation',
          },
        });
      }
      if (!pinned.signing) {
        throw PredictError.from(PredictErrorCode.VENUE_SIGNING_REFUSED, {
          metadata: {
            phase: 'commit',
            mutationRelay: 'not_relayed_this_invocation',
          },
        });
      }
      return pinned;
    };
    this.trading = {
      previewOrder: async (params, options) => {
        // Copy before the network await: later form edits are not approval.
        params = { ...params };
        const generation = this.#previewGeneration;
        const approvalGeneration = signing?.getApprovalGeneration();
        try {
          // Version tolerance (ADR-0001): the deployed backend's strict
          // request schema rejects unknown keys, so a buy keeps the exact
          // PRED-1194 body without `action`; only a sell carries the
          // discriminator.
          const wireParams: FetchOrderPreviewParams =
            params.action === 'buy'
              ? {
                  marketId: params.marketId,
                  side: params.side,
                  amount: params.amount,
                  idempotencyKey: params.idempotencyKey,
                }
              : {
                  marketId: params.marketId,
                  side: params.side,
                  action: 'sell',
                  contracts: params.contracts,
                  idempotencyKey: params.idempotencyKey,
                };
          const value = await client.fetchOrderPreview(
            this.venueId,
            wireParams,
            options,
          );
          const result = parsePredictOrderPreview(value);
          const isQuotedForIntent = (() => {
            if (
              result.venueId !== this.venueId ||
              result.marketId !== params.marketId ||
              result.side !== params.side ||
              result.action !== params.action
            ) {
              return false;
            }
            if (params.action === 'buy') {
              // The backend echoes the requested amount normalized to two
              // decimals, so '20' and '20.00' are the same amount.
              return (
                result.action === 'buy' &&
                isSameAmount(result.requestedAmount, params.amount)
              );
            }
            return (
              result.action === 'sell' &&
              result.requestedContracts === Number(params.contracts)
            );
          })();
          if (!isQuotedForIntent) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          // A buy signs the contracts its typed spend covers at the limit
          // price plus this ceiling, not the average-price estimate.
          const feeCeilingCentsPerContract =
            params.action === 'buy'
              ? await loadFeeCeilingCentsPerContract()
              : undefined;
          if (
            generation !== this.#previewGeneration ||
            approvalGeneration !== signing?.getApprovalGeneration()
          ) {
            throw PredictError.from(PredictErrorCode.PREVIEW_EXPIRED);
          }
          for (const [id, pinned] of this.#previews) {
            if (pinned.expiresAt <= Date.now()) {
              this.#previews.delete(id);
            }
          }
          const snapshot = JSON.stringify({ params, preview: result });
          const existing = this.#previews.get(result.previewId);
          if (
            existing &&
            (existing.snapshot !== snapshot ||
              existing.approvalGeneration !== approvalGeneration)
          ) {
            this.#previews.delete(result.previewId);
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          if (!this.#previews.has(result.previewId)) {
            while (this.#previews.size >= MAX_PINNED_PREVIEWS) {
              const oldest = this.#previews.keys().next().value;
              if (oldest !== undefined) this.#previews.delete(oldest);
            }
            this.#previews.set(result.previewId, {
              expiresAt: Date.parse(result.expiresAt),
              approvalGeneration,
              signing: kalshiOrderSigningInput(
                params,
                result,
                feeCeilingCentsPerContract,
              ),
              snapshot,
            });
          }
          return result;
        } catch (error) {
          return mapError(error, 'preview');
        }
      },
      invalidatePreviews: () => {
        this.#previewGeneration += 1;
        this.#previews.clear();
      },
      reviewOrder: async (previewId) => {
        const pinned = currentPreview(previewId);
        const display = await signing?.previewOperation?.('order.place', {
          ...pinned.signing,
          approvalGeneration: pinned.approvalGeneration,
        });
        if (currentPreview(previewId) !== pinned || !display) {
          throw PredictError.from(PredictErrorCode.VENUE_SIGNING_REFUSED);
        }
        pinned.review = {
          previewId,
          maxCost: display.maxCost,
          contracts: display.contracts,
          payout: display.payout,
          proceedsIfFullyFilled: display.minProceeds,
        };
        return { ...pinned.review };
      },
      // One signed submission per invocation; observation is observeOrder.
      commitOrder: async (previewId, approval, options) => {
        try {
          const pinned = currentPreview(previewId);
          if (approval.kind !== 'user-approved' || !pinned.review) {
            throw PredictError.from(PredictErrorCode.VENUE_SIGNING_REFUSED, {
              metadata: {
                phase: 'commit',
                mutationRelay: 'not_relayed_this_invocation',
              },
            });
          }
          const value = await client.commitOrder(
            this.venueId,
            { previewId },
            options,
            {
              ...pinned.signing,
              approvalGeneration: pinned.approvalGeneration,
              confirmed: true,
            },
          );
          const result = parsePredictOrderReceipt(value);
          if (
            result.venueId !== this.venueId ||
            result.previewId !== previewId
          ) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error, 'commit');
        }
      },
      observeOrder: async (previewId, options) => {
        try {
          const value = await client.observeOrder(
            this.venueId,
            { previewId },
            options,
          );
          const result = parsePredictOrderReceipt(value);
          if (
            result.venueId !== this.venueId ||
            result.previewId !== previewId
          ) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error, 'observe');
        }
      },
      listUnresolvedOrders: async (params, options) => {
        try {
          const value = await client.listUnresolvedOrders(
            this.venueId,
            params,
            options,
          );
          const result = parsePredictUnresolvedOrdersPage(value);
          if (
            result.operations.some(
              ({ receipt }) => receipt.venueId !== this.venueId,
            )
          ) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error, 'observe');
        }
      },
    };

    /** The deposit the route answered for `operationId`, or a refusal. */
    const depositFor = (
      value: unknown,
      operationId: string,
    ): PredictDepositOperation => {
      const deposit = parsePredictDepositOperation(value);
      if (deposit.operationId.toLowerCase() !== operationId.toLowerCase()) {
        throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
      }
      return deposit;
    };
    // Withdrawals are bearer-only and server-pinned: the backend owns the
    // destination, the expiry, and the idempotency key, so there is nothing
    // for the adapter to pin locally.
    this.funding = {
      previewWithdraw: async (params, options) => {
        try {
          const value = await client.fetchWithdrawPreview(
            this.venueId,
            params,
            options,
          );
          const result = parsePredictWithdrawPreview(value);
          // The backend owns the destination and the expiry, but not the
          // intent: a quote for another mode or amount is not the one the
          // person asked to approve.
          const requestedAmount = 'amount' in params ? params.amount : undefined;
          const quotedForIntent =
            result.venueId === this.venueId &&
            result.mode ===
              (requestedAmount === undefined ? 'sweep_all' : 'fixed') &&
            (requestedAmount === undefined ||
              (result.requestedAmount !== undefined &&
                isSameAmount(result.requestedAmount, requestedAmount)));
          if (!quotedForIntent) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error, 'preview');
        }
      },
      commitWithdraw: async (previewId, options) => {
        try {
          const value = await client.commitWithdraw(
            this.venueId,
            previewId,
            options,
          );
          return parseOwnWithdrawReceipt(value, this.venueId, previewId);
        } catch (error) {
          return mapError(error, 'commit');
        }
      },
      observeWithdraw: async (previewId, options) => {
        try {
          const value = await client.observeWithdraw(
            this.venueId,
            previewId,
            options,
          );
          return parseOwnWithdrawReceipt(value, this.venueId, previewId);
        } catch (error) {
          return mapError(error, 'observe');
        }
      },
      prepareDeposit: async (params, approval, options) => {
        // Copy before the network await: later form edits are not approval.
        params = {
          amount: params.amount,
          clientOperationId: params.clientOperationId,
        };
        if (approval.kind !== 'user-approved') {
          throw unsentFundingError(PredictErrorCode.VENUE_SIGNING_REFUSED);
        }
        if (!isValidDepositParams(params)) {
          throw unsentFundingError(PredictErrorCode.DEPOSIT_AMOUNT_REJECTED);
        }
        // The approval belongs to this session generation. A lock or an
        // identity change before signing revokes it.
        const approvalGeneration = signing?.getApprovalGeneration();
        if (approvalGeneration === undefined) {
          throw unsentFundingError(PredictErrorCode.UNAUTHENTICATED);
        }
        const ownDeposit = (
          deposit: PredictDepositOperation,
        ): PredictDepositOperation => {
          if (!isSameDepositAmount(deposit.amount, params.amount)) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return deposit;
        };
        let start;
        try {
          // Unsigned: stores nothing and calls nothing on the venue.
          start = parsePredictDepositStart(
            await client.startDeposit(this.venueId, params, options),
          );
        } catch (error) {
          return mapError(error, 'preview', FUNDING_ROUTE);
        }
        if (start.kind === 'deposit') {
          // This clientOperationId already created its deposit.
          return ownDeposit(start.deposit);
        }
        const inputs = kalshiDepositSigningInputs(params, start.signRequest);
        if (!inputs) {
          throw unsentFundingError(PredictErrorCode.INVALID_RESPONSE);
        }
        try {
          const created = parsePredictDepositStart(
            await client.createDeposit(this.venueId, params, options, {
              inputs,
              approvalGeneration,
              confirmed: true,
            }),
          );
          if (created.kind !== 'deposit') {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return ownDeposit(created.deposit);
        } catch (error) {
          return mapError(error, 'commit', FUNDING_ROUTE);
        }
      },
      getDeposit: async (operationId, options) => {
        if (!UUID.test(operationId)) {
          throw PredictError.from(PredictErrorCode.DEPOSIT_NOT_FOUND);
        }
        try {
          return depositFor(
            await client.getDeposit(this.venueId, operationId, options),
            operationId,
          );
        } catch (error) {
          return mapError(error, 'observe', FUNDING_ROUTE);
        }
      },
      listOpenDeposits: async (options) => {
        try {
          return parsePredictOpenDeposits(
            await client.listOpenDeposits(this.venueId, options),
          );
        } catch (error) {
          return mapError(error, 'observe', FUNDING_ROUTE);
        }
      },
      reportDepositTransfer: async (operationId, params, options) => {
        if (!UUID.test(operationId)) {
          throw unsentFundingError(PredictErrorCode.DEPOSIT_NOT_FOUND);
        }
        if (
          !TRANSACTION_HASH.test(params.txHash) ||
          !Number.isSafeInteger(params.chainId) ||
          params.chainId <= 0
        ) {
          throw unsentFundingError(PredictErrorCode.DEPOSIT_TRANSFER_MISMATCH);
        }
        try {
          return depositFor(
            await client.reportDepositTransfer(
              this.venueId,
              operationId,
              { txHash: params.txHash, chainId: params.chainId },
              options,
            ),
            operationId,
          );
        } catch (error) {
          return mapError(error, 'commit', DEPOSIT_TRANSFER_ROUTE);
        }
      },
      cancelDeposit: async (operationId, options) => {
        if (!UUID.test(operationId)) {
          throw unsentFundingError(PredictErrorCode.DEPOSIT_NOT_FOUND);
        }
        try {
          return depositFor(
            await client.cancelDeposit(this.venueId, operationId, options),
            operationId,
          );
        } catch (error) {
          return mapError(error, 'commit', DEPOSIT_CANCEL_ROUTE);
        }
      },
    };

    this.portfolio = {
      fetchBalance: async (options) => {
        try {
          const value = await client.fetchBalance(this.venueId, options);
          const result = parsePredictBalance(value);
          if (result.venueId !== this.venueId) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
      fetchPositions: async (params, options) => {
        try {
          const value = await client.fetchPositions(
            this.venueId,
            params,
            options,
          );
          const result = parsePredictPositionsPage(value);
          if (
            result.venueId !== this.venueId ||
            result.positions.some(
              (position) => position.venueId !== this.venueId,
            )
          ) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
      // The backend serves the holdings totals; the available balance is
      // the Balance route's value, so each route reads one venue page.
      fetchPortfolioSummary: async (options) => {
        try {
          const [holdings, balanceValue] = await Promise.all([
            client.fetchPortfolioSummary(this.venueId, options),
            client.fetchBalance(this.venueId, options),
          ]);
          const balance = parsePredictBalance(balanceValue);
          if (balance.venueId !== this.venueId) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          const result = composePredictPortfolioSummary(holdings, balance);
          if (result.venueId !== this.venueId) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
      fetchActivity: async (params, options) => {
        try {
          const value = await client.fetchActivity(
            this.venueId,
            params,
            options,
          );
          const result = parsePredictActivityPage(value);
          if (
            result.venueId !== this.venueId ||
            result.activity.some((entry) => entry.venueId !== this.venueId)
          ) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
    };
    this.marketData = {
      // The API catalog is authoritative for every action, including
      // `withdraw`: the deployment advertises it only while its fence serves
      // the route. A failed read surfaces as an error, so the UI omits
      // actions instead of fabricating support.
      fetchVenueCatalog: async (options) => {
        try {
          const value = await client.fetchVenueCatalog(this.venueId, options);
          return parsePredictVenueCatalog(value, this.venueId);
        } catch (error) {
          return mapError(error);
        }
      },
      fetchVenueStatus: async (options) => {
        try {
          const value = await client.fetchVenueStatus(this.venueId, options);
          const result = parsePredictVenueStatus(value);
          if (result.venueId !== this.venueId) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
      fetchFeed: async (feedId, params, options) => {
        try {
          const value = await client.fetchFeed(
            this.venueId,
            feedId,
            params,
            options,
          );
          const result = parsePredictFeed(value);
          if (
            result.venueId !== this.venueId ||
            result.id !== feedId ||
            result.events.some((event) => event.venueId !== this.venueId)
          ) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
      fetchEvent: async (eventId, options) => {
        try {
          const value = await client.fetchEvent(this.venueId, eventId, options);
          const result = parsePredictEvent(value);
          if (result.venueId !== this.venueId || result.id !== eventId) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
      fetchMarketHistory: async (marketId, range, options) => {
        try {
          const value = await client.fetchMarketHistory(
            this.venueId,
            marketId,
            range,
            options,
          );
          const result = parsePredictMarketHistory(value);
          if (
            result.venueId !== this.venueId ||
            result.marketId !== marketId ||
            result.range !== range
          ) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
      searchEvents: async (params, options) => {
        try {
          const value = await client.searchEvents(
            this.venueId,
            params,
            options,
          );
          const result = parsePredictSearchResults(value);
          if (
            result.venueId !== this.venueId ||
            result.events.some((event) => event.venueId !== this.venueId)
          ) {
            throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
          }
          return result;
        } catch (error) {
          return mapError(error);
        }
      },
    };
  }
}
