import {
  type AnyStruct,
  array,
  boolean,
  enums,
  literal,
  mask,
  nullable,
  number,
  object,
  optional,
  refine,
  size,
  string,
  unknown,
} from '@metamask/superstruct';
import { PredictError, PredictErrorCode } from '../../errors';
import type {
  PredictAmount,
  PredictDepositNextStep,
  PredictDepositOperation,
  PredictDepositOperationStep,
  PredictDepositSignRequest,
  PredictDepositStart,
  PredictDepositStatus,
  PredictEntityId,
  PredictHex,
  PredictTimestamp,
  PredictWithdrawPreview,
  PredictWithdrawReceipt,
  PredictWithdrawRejectionCode,
} from '../../types';
import { amount, timestamp } from './primitives';

/**
 * The deposit operation contract of va-mmcx-predict-api `docs/FUNDING.md`
 * ("Deposit operations" and "Creating a deposit"). Every parser fails closed
 * with `INVALID_RESPONSE`: an unknown status or step kind, a malformed amount
 * or address, or a step that does not fit the status stops the flow.
 */

const DEPOSIT_STATUSES = [
  'awaiting_transfer',
  'processing',
  'completed',
  'cancelled',
  'failed',
  'under_review',
] as const satisfies readonly PredictDepositStatus[];

/** Statuses the open-deposits route never returns. */
const CLOSED_STATUSES: readonly PredictDepositStatus[] = [
  'completed',
  'cancelled',
  'failed',
];

/**
 * The steps each status can carry. A Funding Plan only ever comes with a
 * deposit waiting for its transfer; past its deadline that deposit waits.
 */
const STEPS_BY_STATUS: Record<
  PredictDepositStatus,
  readonly (PredictDepositOperationStep['kind'] | null)[]
> = {
  awaiting_transfer: ['wallet_transfer', 'wait'],
  processing: ['wait'],
  completed: ['done'],
  cancelled: [null],
  failed: [null],
  under_review: ['review'],
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const operationId = refine(string(), 'PredictDepositOperationId', (value) =>
  UUID.test(value),
);
const clientOperationId = refine(
  string(),
  'PredictClientOperationId',
  (value) => UUID_V4.test(value),
);

/** What the routes send: decimal USD with exactly two decimals ("25.50"). */
const usdAmount = refine(string(), 'PredictUsdAmount', (value) =>
  /^(?:0|[1-9]\d*)\.\d{2}$/u.test(value),
);

const address = refine(string(), 'PredictAddress', (value) =>
  /^0x[0-9a-fA-F]{40}$/u.test(value),
);

const transactionHash = refine(string(), 'PredictTransactionHash', (value) =>
  /^0x[0-9a-fA-F]{64}$/u.test(value),
);

const positiveInteger = refine(
  number(),
  'PredictPositiveInteger',
  (value) => Number.isSafeInteger(value) && value > 0,
);

const signRequestSchema = object({
  kind: literal('sign_request'),
  amountCents: positiveInteger,
  clientOperationId,
});

/** One schema per step kind. A kind missing here fails parsing. */
const STEP_SCHEMAS = {
  sign_request: signRequestSchema,
  wallet_transfer: object({
    kind: literal('wallet_transfer'),
    chainId: positiveInteger,
    tokenContract: address,
    amount: usdAmount,
    depositAddress: address,
    planExpiresAt: timestamp,
  }),
  wait: object({ kind: literal('wait') }),
  done: object({ kind: literal('done') }),
  review: object({
    kind: literal('review'),
    supportReference: size(string(), 1, 128),
  }),
} as const;

const depositSchema = object({
  operationId,
  status: enums(DEPOSIT_STATUSES),
  amount: usdAmount,
  chainId: positiveInteger,
  tokenContract: address,
  depositAddress: nullable(address),
  planExpiresAt: nullable(timestamp),
  txHash: nullable(transactionHash),
  createdAt: timestamp,
  // Checked by kind below.
  next: nullable(unknown()),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const invalid = (): PredictError =>
  PredictError.from(PredictErrorCode.INVALID_RESPONSE);

/** Throws a plain error; each public parser maps it to `INVALID_RESPONSE`. */
const parseNextStep = (value: unknown): PredictDepositNextStep => {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    throw new Error('A next step must carry a kind.');
  }
  if (!Object.hasOwn(STEP_SCHEMAS, value.kind)) {
    throw new Error('Unknown next step kind.');
  }
  const schema = STEP_SCHEMAS[value.kind as keyof typeof STEP_SCHEMAS];
  return mask(value, schema as AnyStruct) as PredictDepositNextStep;
};

const parseDeposit = (value: unknown): PredictDepositOperation => {
  const deposit = mask(value, depositSchema);
  const next = deposit.next === null ? null : parseNextStep(deposit.next);
  if (next?.kind === 'sign_request') {
    throw new Error('A deposit never asks to be signed.');
  }
  if (!STEPS_BY_STATUS[deposit.status].includes(next?.kind ?? null)) {
    throw new Error('The next step does not fit the deposit status.');
  }
  // The plan repeats the deposit's own fields. A plan that disagrees with
  // its deposit could send funds somewhere the deposit does not name.
  if (
    next?.kind === 'wallet_transfer' &&
    (next.chainId !== deposit.chainId ||
      next.tokenContract !== deposit.tokenContract ||
      next.amount !== deposit.amount ||
      next.depositAddress !== deposit.depositAddress ||
      next.planExpiresAt !== deposit.planExpiresAt)
  ) {
    throw new Error('The Funding Plan does not match its deposit.');
  }
  if (
    next?.kind === 'review' &&
    next.supportReference !== deposit.operationId
  ) {
    throw new Error('The support reference is not the operation ID.');
  }
  return {
    operationId: deposit.operationId as PredictEntityId,
    status: deposit.status,
    amount: deposit.amount as PredictAmount,
    chainId: deposit.chainId,
    tokenContract: deposit.tokenContract as PredictHex,
    depositAddress: deposit.depositAddress as PredictHex | null,
    planExpiresAt: deposit.planExpiresAt as PredictTimestamp | null,
    txHash: deposit.txHash as PredictHex | null,
    createdAt: deposit.createdAt as PredictTimestamp,
    next: next as PredictDepositOperationStep | null,
  };
};

/** Parses one deposit from `GET /v1/venues/kalshi/deposits/{operationId}`,
 * the cancel and transfer routes, or a signed create. */
export const parsePredictDepositOperation = (
  value: unknown,
): PredictDepositOperation => {
  try {
    return parseDeposit(value);
  } catch {
    throw invalid();
  }
};

/** Parses `GET /v1/venues/kalshi/deposits?state=open`: `{ deposits }`,
 * oldest first. A closed or repeated deposit fails parsing. */
export const parsePredictOpenDeposits = (
  value: unknown,
): PredictDepositOperation[] => {
  try {
    const page = mask(value, object({ deposits: array(unknown()) }));
    const seen = new Set<string>();
    return page.deposits.map((entry) => {
      const deposit = parseDeposit(entry);
      if (
        CLOSED_STATUSES.includes(deposit.status) ||
        seen.has(deposit.operationId)
      ) {
        throw new Error('Invalid open deposit.');
      }
      seen.add(deposit.operationId);
      return deposit;
    });
  } catch {
    throw invalid();
  }
};

/**
 * Parses `POST /v1/venues/kalshi/deposits`. Unsigned, it answers
 * `{ next: sign_request }`; a repeated `clientOperationId` answers the
 * stored deposit instead, signed or not.
 */
export const parsePredictDepositStart = (
  value: unknown,
): PredictDepositStart => {
  try {
    if (isRecord(value) && Object.hasOwn(value, 'operationId')) {
      return { kind: 'deposit', deposit: parseDeposit(value) };
    }
    const { next } = mask(value, object({ next: unknown() }));
    const step = parseNextStep(next);
    if (step.kind !== 'sign_request') {
      throw new Error('Only a deposit carries this step.');
    }
    return {
      kind: 'sign_request',
      signRequest: step satisfies PredictDepositSignRequest,
    };
  } catch {
    throw invalid();
  }
};

const venueId = literal('kalshi');
const entityId = refine(
  string(),
  'PredictEntityId',
  (value) => value.length > 0,
);

const withdrawMode = enums(['fixed', 'sweep_all'] as const);

/** A payout destination is server-resolved and always read-only on the phone,
 * so every field is required and none may be invented locally. */
const destinationSchema = object({
  address: refine(string(), 'PredictWithdrawAddress', (value) => {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed === value;
  }),
  network: enums(['base'] as const),
  source: enums(['configured_demo', 'venue', 'registered'] as const),
});

/** Absent-not-null (ADR-0001): a `sweep_all` quote omits `requestedAmount`
 * rather than nulling it, so a null fails validation instead of being
 * masked away. */
const previewSchema = object({
  previewId: entityId,
  venueId,
  currency: literal('USD'),
  mode: withdrawMode,
  requestedAmount: optional(amount),
  destination: destinationSchema,
  expiresAt: timestamp,
});

const receiptStatus = enums([
  'pending',
  'processing',
  'settled',
  'failed',
  'returned',
  'rejected',
] as const);

const rejectionCode = enums([
  'insufficient_balance',
  'amount_below_minimum',
  'step_up_verification_required',
  'venue_rejected',
] as const);

/** Nullable fields arrive as explicit nulls until the Venue reports them. */
const receiptSchema = object({
  operationId: entityId,
  previewId: entityId,
  venueId,
  currency: literal('USD'),
  mode: withdrawMode,
  status: receiptStatus,
  rejectionCode: optional(rejectionCode),
  needsManualReview: boolean(),
  requestedAmount: optional(amount),
  withdrawnAmount: nullable(amount),
  venueTransferId: nullable(entityId),
  destination: destinationSchema,
  createdAt: timestamp,
  resolvedAt: nullable(timestamp),
});

/** A fixed intent names an amount and a sweep names none; neither may carry
 * the other's field. */
const assertModeAmount = (
  mode: 'fixed' | 'sweep_all',
  requestedAmount: string | undefined,
): void => {
  if (mode === 'fixed' && requestedAmount === undefined) {
    throw new Error('A fixed withdrawal requires requestedAmount.');
  }
  if (mode === 'sweep_all' && requestedAmount !== undefined) {
    throw new Error('A sweep-all withdrawal carries no requestedAmount.');
  }
};

/**
 * Parses a server Withdraw Preview. Every value is backend-owned: the amount
 * it echoes, the destination it resolved, and the expiry it set. Unknown
 * fields are masked at this boundary, and a `sweep_all` quote carrying an
 * amount (or a `fixed` quote missing one) fails instead of being repaired.
 */
export const parsePredictWithdrawPreview = (
  value: unknown,
): PredictWithdrawPreview => {
  try {
    const preview = mask(value, previewSchema);
    assertModeAmount(preview.mode, preview.requestedAmount);
    return preview as unknown as PredictWithdrawPreview;
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};

/**
 * Parses a server Withdraw Receipt. A refusal is the only status that
 * explains itself, so `rejectionCode` is required on `rejected` and rejected
 * on every other status; an in-progress receipt keeps its nullable transfer
 * fields as explicit nulls.
 */
export const parsePredictWithdrawReceipt = (
  value: unknown,
): PredictWithdrawReceipt => {
  try {
    const receipt = mask(value, receiptSchema);
    assertModeAmount(receipt.mode, receipt.requestedAmount);
    const rejection = receipt.rejectionCode as
      | PredictWithdrawRejectionCode
      | undefined;
    if (receipt.status === 'rejected' && rejection === undefined) {
      throw new Error('A rejected receipt requires rejectionCode.');
    }
    if (receipt.status !== 'rejected' && rejection !== undefined) {
      throw new Error('rejectionCode is valid only on a rejected receipt.');
    }
    return receipt as unknown as PredictWithdrawReceipt;
  } catch {
    throw PredictError.from(PredictErrorCode.INVALID_RESPONSE);
  }
};
