import { ethers } from 'ethers';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { bytesToHex, Hex } from '@metamask/utils';
import { parse as uuidParse, v4 as uuidv4 } from 'uuid';
import type {
  ClaimDto,
  ClaimRouteSlug,
  ClaimVoucherDto,
  EarningsSummaryDto,
  InitiateClaimBody,
  InitiateClaimResult,
  LedgerEntryDto,
  ReferralLocalizedTextKey,
  ReferralVariant,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { RewardsMoneyClaimRefusalError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import Engine from '../../../../core/Engine';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import { isMonadMainnetChainId } from '../../../../util/networks';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import type { MoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import {
  buildMoneyAccountDepositBatch,
  getMoneyAccountDepositAssetAddress,
} from '../../Money/utils/moneyAccountTransactions';

/** Server default `CLAIM_MINIMUM_MUSD_BASE_UNITS`. mUSD has 6 decimals, so this is $1. */
export const CLAIM_MINIMUM_MUSD_BASE_UNITS = 1_000_000n;

const RETRY_REASONS = new Set([
  'PROOF_INVALID',
  'SIGNER_UNAVAILABLE',
  'ADDRESS_SCREENING_UNAVAILABLE',
  'PAIRING_PENDING',
  'PROOF_UNAVAILABLE',
  'SIGN_FAILED',
  'BATCH_NOT_SUBMITTED',
  'VOUCHER_EXPIRED',
  'CONFIRMATION_FAILED',
  'CONFIRMATION_TIMEOUT',
]);

/** Extra wait after `valid_before` so a block on the boundary is not a timeout. */
const CONFIRMATION_GRACE_MS = 30_000;

const TRANSACTION_CONFIRMED_EVENT =
  'TransactionController:transactionConfirmed' as const;
const TRANSACTION_FAILED_EVENT =
  'TransactionController:transactionFailed' as const;

const WAIT_REASONS = new Set([
  'AWAITING_RELEASE',
  'VELOCITY_LIMIT_EXCEEDED',
  'RATE_LIMITED',
  'CLAIM_COOLDOWN',
]);

/**
 * Nothing the user does on this press will pay. The generic sentence does
 * not say "try again": a suspension, a hold, and a void are not a retry.
 */
const TERMINAL_REASONS = new Set(['SUSPENDED', 'UNDER_REVIEW', 'VOIDED']);

export type ClaimToastKey = Extract<
  ReferralLocalizedTextKey,
  | 'claimSuccessToast'
  | 'claimPartialSuccessToast'
  | 'claimFailureToast'
  | 'claimFailureRetryToast'
  | 'claimFailureWaitToast'
  | 'claimFailureMinimumToast'
  | 'claimFailureAddressBlockedToast'
>;

export interface ClaimRouteOutcome {
  route: ClaimRouteSlug;
  submitted: boolean;
  /** A claim row exists, so History can show it while the voucher is open. */
  opened: boolean;
  reason?: string;
  /** `excluded[].reason` from a claim that paid something. */
  excludedReasons?: string[];
  /** From `Retry-After`, so Claim stays disabled until the window reopens. */
  retryAfterSeconds?: number;
}

export function meetsClaimMinimum(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  try {
    return BigInt(value) >= CLAIM_MINIMUM_MUSD_BASE_UNITS;
  } catch {
    return false;
  }
}

/**
 * Pilot: only trade-fee cashback, and only when that family's own claimable
 * is at least $1. Revenue share and follow-trade are not claimed.
 */
export function claimRoutesForSummary(
  summary: EarningsSummaryDto | null | undefined,
): ClaimRouteSlug[] {
  const cashback =
    summary?.self_earned?.by_claim_family?.REFERRAL_TRADE_FEE_CASHBACK
      ?.claimable;
  if (!meetsClaimMinimum(cashback)) {
    return [];
  }
  return ['referral-trade-fee-cashback'];
}

/** A referee whose cashback family clears $1. Referrers do not claim in the pilot. */
export function canClaimEarnings(
  summary: EarningsSummaryDto | null | undefined,
  variant: ReferralVariant | undefined,
): boolean {
  return variant === 'REFEREE' && claimRoutesForSummary(summary).length > 0;
}

/**
 * Money's earning-address key is `namespace:address`, not a CAIP-10. The
 * address is everything after the first colon, so `eip155:0xab…` is the
 * account the keyring signs for. A chain reference that slipped in
 * (`eip155:1:0xab…`) stays in the address half and is not signed.
 */
export function evmAddressFromEarningAddress(
  earningAddress: string,
): string | null {
  const colon = earningAddress.indexOf(':');
  if (colon <= 0 || colon === earningAddress.length - 1) {
    return null;
  }
  const namespace = earningAddress.slice(0, colon).toLowerCase();
  if (namespace !== 'eip155') {
    return null;
  }
  const address = earningAddress.slice(colon + 1);
  if (!address.startsWith('0x')) {
    return null;
  }
  return address;
}

function toastKeyForReason(reason: string): ClaimToastKey {
  if (reason === 'ADDRESS_BLOCKED') {
    return 'claimFailureAddressBlockedToast';
  }
  if (reason === 'BELOW_MINIMUM') {
    return 'claimFailureMinimumToast';
  }
  if (TERMINAL_REASONS.has(reason)) {
    return 'claimFailureToast';
  }
  if (WAIT_REASONS.has(reason)) {
    return 'claimFailureWaitToast';
  }
  if (RETRY_REASONS.has(reason)) {
    return 'claimFailureRetryToast';
  }
  return 'claimFailureToast';
}

/**
 * One toast for the press. A confirmed voucher wins. One that left a group
 * for a later refill (`VELOCITY_LIMIT_DEFERRED`) uses the partial sentence.
 * Otherwise the first actionable refusal wins over a generic one.
 */
export function claimToastKey(outcomes: ClaimRouteOutcome[]): ClaimToastKey {
  const submitted = outcomes.filter((outcome) => outcome.submitted);
  if (submitted.length > 0) {
    const deferred = submitted.some((outcome) =>
      outcome.excludedReasons?.includes('VELOCITY_LIMIT_DEFERRED'),
    );
    return deferred ? 'claimPartialSuccessToast' : 'claimSuccessToast';
  }

  const reasons = outcomes
    .map((outcome) => outcome.reason)
    .filter((reason): reason is string => Boolean(reason));

  const actionable = reasons
    .map(toastKeyForReason)
    .find((key) => key !== 'claimFailureToast');

  return actionable ?? 'claimFailureToast';
}

export interface RunEarningsClaimDeps {
  moneyAccountAddress: string;
  routes: ClaimRouteSlug[];
  initiateClaim: (
    route: ClaimRouteSlug,
    body: InitiateClaimBody,
  ) => Promise<InitiateClaimResult>;
  /**
   * Whether this handset can sign for the earning-address key. EVM software
   * keys on this phone can. Solana, Tron, hardware accounts, and keys that
   * live on another device cannot; snap signing for those can come later.
   */
  canSignEarningAddress: (earningAddress: string) => boolean;
  signMessage: (message: string, earningAddress: string) => Promise<string>;
  submitVoucher: (voucher: ClaimVoucherDto) => Promise<void>;
}

async function claimOneRoute(
  route: ClaimRouteSlug,
  deps: RunEarningsClaimDeps,
): Promise<ClaimRouteOutcome> {
  const { moneyAccountAddress, initiateClaim, signMessage, submitVoucher } =
    deps;
  let result = await initiateClaim(route, {
    money_account_address: moneyAccountAddress,
  });

  if (result.kind === 'proof_required') {
    const signable = result.body.challenges.filter((challenge) =>
      deps.canSignEarningAddress(challenge.earning_address),
    );
    // Proofs are all or nothing for one intent. An address this phone cannot
    // sign has to be left off a new request, or the whole claim fails.
    if (signable.length === 0) {
      return {
        route,
        submitted: false,
        opened: false,
        reason: 'SIGN_FAILED',
      };
    }

    let earningAddresses: string[] | undefined;
    if (signable.length < result.body.challenges.length) {
      earningAddresses = signable.map((challenge) => challenge.earning_address);
      result = await initiateClaim(route, {
        money_account_address: moneyAccountAddress,
        earning_addresses: earningAddresses,
      });
    }

    if (
      result.kind === 'proof_required' &&
      result.body.challenges.some(
        (challenge) => !deps.canSignEarningAddress(challenge.earning_address),
      )
    ) {
      return {
        route,
        submitted: false,
        opened: false,
        reason: 'SIGN_FAILED',
      };
    }

    if (result.kind === 'proof_required') {
      const proofs = [];
      for (const challenge of result.body.challenges) {
        const signature = await signMessage(
          challenge.message,
          challenge.earning_address,
        );
        proofs.push({
          earning_address: challenge.earning_address,
          signature,
        });
      }
      result = await initiateClaim(route, {
        money_account_address: moneyAccountAddress,
        ...(earningAddresses ? { earning_addresses: earningAddresses } : {}),
        claim_intent_id: result.body.claim_intent_id,
        proofs,
      });
      if (result.kind === 'proof_required') {
        return {
          route,
          submitted: false,
          opened: false,
          reason: 'PROOF_INVALID',
        };
      }
    }
  }

  const { body } = result;
  const voucher = body.voucher;
  const ready =
    (body.status === 'OPENED' || body.status === 'LIVE_VOUCHER') &&
    voucher !== null;

  if (!ready || !voucher) {
    return {
      route,
      submitted: false,
      opened: Boolean(body.claim?.id),
      reason:
        body.status === 'AWAITING_RELEASE' ? 'AWAITING_RELEASE' : 'UNKNOWN',
    };
  }

  try {
    await submitVoucher(voucher);
  } catch (error) {
    return {
      route,
      submitted: false,
      opened: true,
      reason: batchFailureReason(error),
    };
  }

  const excludedReasons = body.excluded.map((entry) => entry.reason);
  return {
    route,
    submitted: true,
    opened: true,
    ...(excludedReasons.length > 0 ? { excludedReasons } : {}),
  };
}

export class ClaimVoucherExpiredError extends Error {
  constructor() {
    super('VOUCHER_EXPIRED');
    this.name = 'ClaimVoucherExpiredError';
  }
}

export class ClaimBatchConfirmationError extends Error {
  readonly reason: 'CONFIRMATION_FAILED' | 'CONFIRMATION_TIMEOUT';

  constructor(
    reason: 'CONFIRMATION_FAILED' | 'CONFIRMATION_TIMEOUT',
    message: string,
  ) {
    super(message);
    this.name = 'ClaimBatchConfirmationError';
    this.reason = reason;
  }
}

function batchFailureReason(error: unknown): string {
  if (error instanceof ClaimVoucherExpiredError) {
    return 'VOUCHER_EXPIRED';
  }
  if (error instanceof ClaimBatchConfirmationError) {
    return error.reason;
  }
  return 'BATCH_NOT_SUBMITTED';
}

/**
 * True when a claim batch can be submitted before a voucher is requested.
 * A voucher lasts about a minute, so a missing account, a non-Monad chain, or
 * sponsorship being off must refuse here rather than after the claim opens.
 */
export function isClaimSubmittable({
  moneyAccountAddress,
  chainId,
  isMonadMainnet,
  isSponsored,
}: {
  moneyAccountAddress: string | undefined;
  chainId: string | undefined;
  isMonadMainnet: boolean;
  isSponsored: boolean;
}): boolean {
  return Boolean(
    moneyAccountAddress && chainId && isMonadMainnet && isSponsored,
  );
}

/** Throws once the voucher window has closed. */
export function assertVoucherIsLive(
  voucher: ClaimVoucherDto,
  now: number = Date.now(),
): void {
  if (voucher.valid_before * 1000 <= now) {
    throw new ClaimVoucherExpiredError();
  }
}

/** Voucher time left, plus a short grace for a block landing on the boundary. */
export function confirmationTimeoutMs(
  voucher: ClaimVoucherDto,
  now: number = Date.now(),
): number {
  const remaining = voucher.valid_before * 1000 - now;
  return Math.max(0, remaining) + CONFIRMATION_GRACE_MS;
}

const RECEIVE_WITH_AUTHORIZATION_ABI = [
  'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature)',
];

/** EIP-3009 calldata for the voucher the claim route returned. */
export function buildReceiveWithAuthorizationData(
  voucher: ClaimVoucherDto,
): Hex {
  const iface = new ethers.utils.Interface(RECEIVE_WITH_AUTHORIZATION_ABI);
  return iface.encodeFunctionData('receiveWithAuthorization', [
    voucher.from,
    voucher.to,
    voucher.value,
    voucher.valid_after,
    voucher.valid_before,
    voucher.nonce,
    voucher.signature,
  ]) as Hex;
}

function resolveNetworkClientId(chainId: Hex): string {
  const networkClientId =
    Engine.context.NetworkController.findNetworkClientIdByChainId(chainId);
  if (!networkClientId) {
    throw new Error(`Network client not found for chain ${chainId}`);
  }
  return networkClientId;
}

/**
 * Submits the voucher, then the same mUSD approve and Teller deposit a Money
 * Account deposit uses. Sponsored on Monad mainnet. Resolves only after the
 * batch is confirmed on chain.
 *
 * The deposit call is not typed as `moneyAccountDeposit`: that type asks MM
 * Pay to quote a token the user holds, and this batch is funded by the
 * voucher instead.
 */
export async function submitClaimVoucher({
  voucher,
  vaultConfig,
  moneyAccountAddress,
  now = Date.now,
}: {
  voucher: ClaimVoucherDto;
  vaultConfig: MoneyAccountVaultConfig;
  moneyAccountAddress: string;
  /** Clock for the voucher window. Tests inject one. */
  now?: () => number;
}): Promise<void> {
  assertVoucherIsLive(voucher, now());

  const chainIdHex = vaultConfig.chainId as Hex;
  const provider = getProviderByChainId(chainIdHex);
  if (!provider) {
    throw new Error(`No provider available for chain ${vaultConfig.chainId}`);
  }

  const musdAddress = getMoneyAccountDepositAssetAddress(chainIdHex);
  const { approveTx, depositTx } = await buildMoneyAccountDepositBatch({
    amount: BigInt(voucher.value),
    chainId: chainIdHex,
    boringVault: vaultConfig.boringVault,
    tellerAddress: vaultConfig.tellerAddress,
    accountantAddress: vaultConfig.accountantAddress,
    lensAddress: vaultConfig.lensAddress,
    provider,
  });

  // The deposit preview is an RPC round trip. A voucher that lapsed during it
  // would revert on chain instead of saying why.
  assertVoucherIsLive(voucher, now());

  const batchId = bytesToHex(new Uint8Array(uuidParse(uuidv4())));

  await awaitClaimBatchConfirmed({
    timeoutMs: confirmationTimeoutMs(voucher, now()),
    submit: async () => {
      await addTransactionBatch({
        batchId,
        disableHook: true,
        disableSequential: true,
        disableUpgrade: true,
        from: moneyAccountAddress as Hex,
        isGasFeeSponsored: isMonadMainnetChainId(chainIdHex),
        isInternal: true,
        networkClientId: resolveNetworkClientId(chainIdHex),
        origin: ORIGIN_METAMASK,
        skipInitialGasEstimate: true,
        transactions: [
          {
            params: {
              to: musdAddress,
              data: buildReceiveWithAuthorizationData(voucher),
              value: '0x0' as Hex,
            },
            type: TransactionType.contractInteraction,
          },
          approveTx,
          { ...depositTx, type: TransactionType.contractInteraction },
        ],
      });
      return batchId;
    },
  });
}

type StashedBatchEvent =
  | { kind: 'confirmed'; meta: TransactionMeta }
  | { kind: 'failed'; error: string; meta: TransactionMeta };

/**
 * Subscribes before the batch is submitted, so a confirmation that lands
 * while `addTransactionBatch` is still resolving is not missed. Resolves on
 * `transactionConfirmed` for this batch and rejects on failure or timeout.
 */
async function awaitClaimBatchConfirmed({
  timeoutMs,
  submit,
}: {
  timeoutMs: number;
  submit: () => Promise<Hex>;
}): Promise<void> {
  const messenger = Engine.controllerMessenger;
  let batchId: Hex | undefined;
  let settled = false;
  const timer: { handle?: ReturnType<typeof setTimeout> } = {};
  const stashed: StashedBatchEvent[] = [];

  let resolveResult: () => void = () => undefined;
  let rejectResult: (error: Error) => void = () => undefined;
  const resultPromise = new Promise<void>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const matches = (meta: TransactionMeta): boolean =>
    batchId !== undefined &&
    meta.batchId?.toLowerCase() === batchId.toLowerCase();

  const cleanup = () => {
    clearTimeout(timer.handle);
    messenger.unsubscribe(TRANSACTION_CONFIRMED_EVENT, onConfirmed);
    messenger.unsubscribe(TRANSACTION_FAILED_EVENT, onFailed);
  };

  const settleConfirmed = () => {
    settled = true;
    cleanup();
    resolveResult();
  };

  const settleFailed = (error: Error) => {
    settled = true;
    cleanup();
    rejectResult(error);
  };

  function onConfirmed(meta: TransactionMeta): void {
    if (settled) {
      return;
    }
    if (batchId === undefined) {
      stashed.push({ kind: 'confirmed', meta });
      return;
    }
    if (matches(meta)) {
      settleConfirmed();
    }
  }

  function onFailed(payload: {
    error: string;
    transactionMeta: TransactionMeta;
  }): void {
    if (settled) {
      return;
    }
    if (batchId === undefined) {
      stashed.push({
        kind: 'failed',
        error: payload.error,
        meta: payload.transactionMeta,
      });
      return;
    }
    if (matches(payload.transactionMeta)) {
      settleFailed(
        new ClaimBatchConfirmationError('CONFIRMATION_FAILED', payload.error),
      );
    }
  }

  messenger.subscribe(TRANSACTION_CONFIRMED_EVENT, onConfirmed);
  messenger.subscribe(TRANSACTION_FAILED_EVENT, onFailed);

  timer.handle = setTimeout(() => {
    if (settled) {
      return;
    }
    settleFailed(
      new ClaimBatchConfirmationError(
        'CONFIRMATION_TIMEOUT',
        'CONFIRMATION_TIMEOUT',
      ),
    );
  }, timeoutMs);

  try {
    batchId = await submit();
  } catch (error) {
    if (!settled) {
      settled = true;
      cleanup();
    }
    throw error;
  }

  for (const event of stashed) {
    if (settled) {
      break;
    }
    if (!matches(event.meta)) {
      continue;
    }
    if (event.kind === 'confirmed') {
      settleConfirmed();
    } else {
      settleFailed(
        new ClaimBatchConfirmationError('CONFIRMATION_FAILED', event.error),
      );
    }
  }

  return resultPromise;
}

export async function runEarningsClaim(
  deps: RunEarningsClaimDeps,
): Promise<ClaimRouteOutcome[]> {
  const outcomes: ClaimRouteOutcome[] = [];

  for (const route of deps.routes) {
    try {
      outcomes.push(await claimOneRoute(route, deps));
    } catch (error) {
      const reason =
        error instanceof RewardsMoneyClaimRefusalError
          ? error.reason
          : error instanceof Error && error.message === 'SIGN_FAILED'
            ? 'SIGN_FAILED'
            : 'UNKNOWN';
      outcomes.push({
        route,
        submitted: false,
        opened: false,
        reason,
        retryAfterSeconds:
          error instanceof RewardsMoneyClaimRefusalError
            ? error.retryAfterSeconds
            : undefined,
      });
    }
  }

  return outcomes;
}

export interface PendingClaimRow {
  kind: 'pending-claim';
  id: string;
  net_amount: string;
}

export type EarningsHistoryListItem = LedgerEntryDto | PendingClaimRow;

export function isPendingClaimRow(
  item: EarningsHistoryListItem,
): item is PendingClaimRow {
  return 'kind' in item && item.kind === 'pending-claim';
}

function isInFlightVoucher(claim: ClaimDto): boolean {
  return (
    claim.payout_method === 'VOUCHER' &&
    (claim.status === 'PENDING_SIGNATURE' || claim.status === 'AUTHORIZED')
  );
}

/**
 * In-flight voucher claims are not on the ledger. Prepend them, and drop one
 * once the ledger returns that claim as settled.
 */
export function mergeInFlightClaims(
  ledger: LedgerEntryDto[] | null,
  claims: ClaimDto[],
): EarningsHistoryListItem[] | null {
  if (!ledger) {
    return null;
  }

  const settledClaimIds = new Set(
    ledger.filter((entry) => entry.type === 'claim').map((entry) => entry.id),
  );
  const pending: PendingClaimRow[] = claims
    .filter(
      (claim) => isInFlightVoucher(claim) && !settledClaimIds.has(claim.id),
    )
    .map((claim) => ({
      kind: 'pending-claim',
      id: claim.id,
      net_amount: claim.net_amount,
    }));

  return [...pending, ...ledger];
}
