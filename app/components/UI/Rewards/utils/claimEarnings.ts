import { ethers } from 'ethers';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { isSnapKeyring } from '@metamask/eth-snap-keyring/v2';
import { BtcScope } from '@metamask/keyring-api';
import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { bytesToHex, Hex, type Json } from '@metamask/utils';
import { parse as uuidParse, v4 as uuidv4 } from 'uuid';
import type {
  ClaimDto,
  ClaimRouteSlug,
  ClaimVoucherDto,
  EarningsSummaryDto,
  InitiateClaimBody,
  InitiateClaimResult,
  LedgerEntryDto,
  ReferralLocalizedText,
  ReferralLocalizedTextKey,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import type { MoneyDashboardPersona } from '../../../../reducers/rewardsMoney/selectors';
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

const RETRY_REASONS = new Set([
  'PROOF_INVALID',
  'SIGNER_UNAVAILABLE',
  'ADDRESS_SCREENING_UNAVAILABLE',
  'PAIRING_PENDING',
  'PROOF_UNAVAILABLE',
  // The pod has no usable login keys. The token may be fine; ask again.
  'JWKS_UNAVAILABLE',
  // CHOMP did not answer. The address may still be a Money Account; ask again.
  'MONEY_ACCOUNT_CHECK_UNAVAILABLE',
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
  // A partial claim the signature reserve held back. The message is still
  // VELOCITY_LIMIT_EXCEEDED; the body names this reason.
  'SIGNATURE_RESERVE',
  'RATE_LIMITED',
  'CLAIM_COOLDOWN',
]);

/**
 * Nothing the user does on this press will pay. The generic sentence does
 * not say "try again": a suspension, a hold, and a void are not a retry.
 */
const TERMINAL_REASONS = new Set(['SUSPENDED', 'UNDER_REVIEW', 'VOIDED']);

/**
 * A whole-claim refusal that puts money in `held` or `blocked`. `VOIDED` is
 * not one of them: it names the voided bucket, and only when both are zero.
 */
const CLAIMS_PAUSED_REASONS = new Set([
  'SUSPENDED',
  'TAX_DETERMINATION_REQUIRED',
  'MECHANISM_NOT_CLAIMABLE',
  'EARNING_ADDRESS_UNSCREENABLE',
  'UNDER_REVIEW',
  'EARNING_ADDRESS_MISSING',
]);

/**
 * True when nothing was submitted and every refusal is a held or blocked
 * reason. A paid claim that only names one of these in `excluded[]` is not.
 */
export function isClaimsPausedRefusal(outcomes: ClaimRouteOutcome[]): boolean {
  if (outcomes.some((outcome) => outcome.submitted)) {
    return false;
  }
  const reasons = outcomes
    .map((outcome) => outcome.reason)
    .filter((reason): reason is string => Boolean(reason));
  return (
    reasons.length > 0 &&
    reasons.every((reason) => CLAIMS_PAUSED_REASONS.has(reason))
  );
}

export type ClaimToastKey = Extract<
  ReferralLocalizedTextKey,
  | 'claimSuccessToast'
  | 'claimPartialSuccessToast'
  | 'claimFailureToast'
  | 'claimFailureRetryToast'
  | 'claimFailureWaitToast'
  | 'claimFailureWaitMinutesToast'
  | 'claimFailureMinimumToast'
  | 'claimFailureAddressBlockedToast'
  | 'claimFailureTooLargeToast'
  | 'claimFailureNoEligibleBalanceToast'
  | 'claimFailureUnavailableToast'
  | 'claimFailureContactSupportToast'
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

/**
 * True when `value` is at least the summary minimum. That minimum is
 * `minimum_musd_base_units`, the server's `claimMinimumMusdBaseUnits`.
 * A missing or unreadable minimum is not claimable.
 */
export function meetsClaimMinimum(
  value: string | undefined,
  minimumBaseUnits: string | undefined,
): boolean {
  if (!value || !minimumBaseUnits) {
    return false;
  }
  try {
    return BigInt(value) >= BigInt(minimumBaseUnits);
  } catch {
    return false;
  }
}

/**
 * Pilot: only trade-fee cashback, and only when that family's own claimable
 * reaches the summary's `minimum_musd_base_units`. Revenue share and
 * follow-trade are not claimed.
 */
export function claimRoutesForSummary(
  summary: EarningsSummaryDto | null | undefined,
): ClaimRouteSlug[] {
  const cashback =
    summary?.self_earned?.by_claim_family?.REFERRAL_TRADE_FEE_CASHBACK
      ?.claimable;
  if (!meetsClaimMinimum(cashback, summary?.minimum_musd_base_units)) {
    return [];
  }
  return ['referral-trade-fee-cashback'];
}

/** A referee whose cashback family reaches the summary minimum. Referrers do not claim in the pilot. */
export function canClaimEarnings(
  summary: EarningsSummaryDto | null | undefined,
  persona: MoneyDashboardPersona | undefined,
): boolean {
  return persona === 'referee' && claimRoutesForSummary(summary).length > 0;
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

/** Mainnet P2WPKH (`bc1q…`, 42 characters) and P2TR (`bc1p…`, 62). */
const BITCOIN_P2WPKH = /^bc1q[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$/;
const BITCOIN_P2TR = /^bc1p[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58}$/;

/**
 * The Bitcoin address in `bip122:<address>`. Only a mainnet `bc1q` or `bc1p`
 * address can be proven with BIP-322. Legacy and testnet addresses are not.
 */
export function bitcoinAddressFromEarningAddress(
  earningAddress: string,
): string | null {
  const colon = earningAddress.indexOf(':');
  if (colon <= 0 || colon === earningAddress.length - 1) {
    return null;
  }
  const namespace = earningAddress.slice(0, colon).toLowerCase();
  if (namespace !== 'bip122') {
    return null;
  }
  const address = earningAddress.slice(colon + 1);
  if (!BITCOIN_P2WPKH.test(address) && !BITCOIN_P2TR.test(address)) {
    return null;
  }
  return address;
}

/**
 * The claim wire form of a Bitcoin snap signature. The snap returns the
 * BIP-322 witness as base64; the route wants those bytes as `0x` hex.
 */
export function bitcoinProofHex(signature: string): string | null {
  const trimmed = signature.trim();
  if (trimmed.startsWith('0x')) {
    return /^0x[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0
      ? trimmed.toLowerCase()
      : null;
  }
  if (trimmed === '' || !/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) {
    return null;
  }
  const bytes = Buffer.from(trimmed, 'base64');
  if (bytes.length === 0) {
    return null;
  }
  return `0x${bytes.toString('hex')}`;
}

function signatureFromKeyringResult(result: Json): string | null {
  if (
    typeof result !== 'object' ||
    result === null ||
    Array.isArray(result) ||
    !('signature' in result)
  ) {
    return null;
  }
  const { signature } = result;
  return typeof signature === 'string' ? bitcoinProofHex(signature) : null;
}

/**
 * BIP-322 simple signature over the claim challenge, as `0x` hex.
 *
 * The Bitcoin snap's `signMessage` shows its confirmation and returns the
 * witness as base64. The claim route wants those bytes as hex. `params.account`
 * is the address; the request's `account` is the snap account id.
 */
export async function signBitcoinClaimMessage(
  accountId: string,
  address: string,
  message: string,
): Promise<string> {
  let result: Json;
  try {
    result = (await Engine.context.KeyringController.withKeyringV2(
      {
        filter: (keyring) =>
          isSnapKeyring(keyring) && keyring.hasAccount(accountId),
      },
      async ({ keyring }) => {
        if (!isSnapKeyring(keyring)) {
          throw new Error('SIGN_FAILED');
        }
        return keyring.submitRequest({
          id: uuidv4(),
          origin: 'metamask',
          scope: BtcScope.Mainnet,
          account: accountId,
          request: {
            method: 'signMessage',
            params: { account: { address }, message },
          },
        });
      },
    )) as Json;
  } catch (error) {
    if (error instanceof Error && error.message === 'SIGN_FAILED') {
      throw error;
    }
    throw new Error('SIGN_FAILED');
  }

  const signature = signatureFromKeyringResult(result);
  if (!signature) {
    throw new Error('SIGN_FAILED');
  }
  return signature;
}

/**
 * A challenge this phone cannot prove is not a retry. Pressing Claim again
 * cannot succeed. An EVM address on a keyring this phone will not sign stays
 * a retry: the user may switch to a software account.
 */
function unsignedChallengeReason(
  challenges: { earning_address: string }[],
): 'UNSUPPORTED_EARNING_ADDRESS' | 'SIGN_FAILED' {
  const unsupported = challenges.every(
    (challenge) =>
      evmAddressFromEarningAddress(challenge.earning_address) === null,
  );
  return unsupported ? 'UNSUPPORTED_EARNING_ADDRESS' : 'SIGN_FAILED';
}

function toastKeyForReason(
  reason: string,
  retryAfterSeconds?: number,
): ClaimToastKey {
  if (reason === 'ADDRESS_BLOCKED') {
    return 'claimFailureAddressBlockedToast';
  }
  if (reason === 'BELOW_MINIMUM') {
    return 'claimFailureMinimumToast';
  }
  if (reason === 'CLAIM_TOO_LARGE') {
    return 'claimFailureTooLargeToast';
  }
  if (reason === 'NO_ELIGIBLE_BALANCE') {
    return 'claimFailureNoEligibleBalanceToast';
  }
  if (
    reason === 'EARNING_ADDRESS_UNSCREENABLE' ||
    reason === 'UNSUPPORTED_EARNING_ADDRESS' ||
    reason === 'TAX_DETERMINATION_REQUIRED' ||
    reason === 'PAYOUT_ADDRESS_NOT_MONEY_ACCOUNT'
  ) {
    return 'claimFailureUnavailableToast';
  }
  if (reason === 'EARNING_ADDRESS_MISSING') {
    return 'claimFailureContactSupportToast';
  }
  if (TERMINAL_REASONS.has(reason)) {
    return 'claimFailureToast';
  }
  if (WAIT_REASONS.has(reason)) {
    // `{minutes}` is ceil(Retry-After / 60). No header keeps the later sentence.
    if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
      return 'claimFailureWaitMinutesToast';
    }
    return 'claimFailureWaitToast';
  }
  if (RETRY_REASONS.has(reason)) {
    return 'claimFailureRetryToast';
  }
  return 'claimFailureToast';
}

/**
 * One toast for the press. A confirmed voucher wins: a group left for a later
 * refill (`VELOCITY_LIMIT_DEFERRED`) uses the partial sentence, and any other
 * paid claim uses success, including one that also left money in `excluded[]`.
 * Refusal sentences apply only when nothing was paid, and a specific one wins
 * over the generic failure sentence.
 */
export function claimToastKey(outcomes: ClaimRouteOutcome[]): ClaimToastKey {
  const submitted = outcomes.filter((outcome) => outcome.submitted);
  if (submitted.length > 0) {
    const deferred = submitted.some((outcome) =>
      outcome.excludedReasons?.includes('VELOCITY_LIMIT_DEFERRED'),
    );
    return deferred ? 'claimPartialSuccessToast' : 'claimSuccessToast';
  }

  const actionable = outcomes
    .filter((outcome): outcome is ClaimRouteOutcome & { reason: string } =>
      Boolean(outcome.reason),
    )
    .map((outcome) =>
      toastKeyForReason(outcome.reason, outcome.retryAfterSeconds),
    )
    .find((key) => key !== 'claimFailureToast');

  return actionable ?? 'claimFailureToast';
}

/**
 * The sentence for one press. A wait that carried `Retry-After` fills
 * `{minutes}` with `ceil(seconds / 60)`. An older localized payload without
 * that key keeps the later sentence.
 */
export function claimToastText(
  localizedText: Pick<ReferralLocalizedText, ClaimToastKey>,
  outcomes: ClaimRouteOutcome[],
): string {
  const key = claimToastKey(outcomes);
  if (key !== 'claimFailureWaitMinutesToast') {
    return localizedText[key];
  }
  const template = localizedText.claimFailureWaitMinutesToast;
  if (!template?.includes('{minutes}')) {
    return localizedText.claimFailureWaitToast;
  }
  const seconds = outcomes.reduce(
    (longest, outcome) => Math.max(longest, outcome.retryAfterSeconds ?? 0),
    0,
  );
  return template.replaceAll('{minutes}', String(Math.ceil(seconds / 60)));
}

/** Segment `claim_type` for a claim route. Follow-trade has no route yet. */
export function claimTypeForRoute(route: ClaimRouteSlug): string {
  switch (route) {
    case 'referral-trade-fee-cashback':
      return 'cashback';
    case 'referral-rev-share':
      return 'rev_share';
    default: {
      const unhandled: never = route;
      return unhandled;
    }
  }
}

/**
 * Client bucket for a route that did not pay. `not_submittable` is decided
 * before a route runs, so it is not a member of this map.
 */
export function claimFailureReason(reason: string): string {
  if (reason === 'MECHANISM_NOT_CLAIMABLE') {
    return 'not_claimable';
  }
  if (CLAIMS_PAUSED_REASONS.has(reason)) {
    return 'paused';
  }
  if (reason === 'UNSUPPORTED_EARNING_ADDRESS') {
    return 'unsupported';
  }
  if (reason === 'ADDRESS_BLOCKED') {
    return 'address_blocked';
  }
  if (reason === 'BELOW_MINIMUM') {
    return 'below_minimum';
  }
  if (reason === 'CLAIM_TOO_LARGE') {
    return 'too_large';
  }
  if (reason === 'NO_ELIGIBLE_BALANCE') {
    return 'nothing_to_claim';
  }
  if (WAIT_REASONS.has(reason)) {
    return 'wait';
  }
  if (RETRY_REASONS.has(reason) || reason === 'SERVER_BUSY') {
    return 'retry';
  }
  return 'other';
}

/** True only when a paid claim left a refill for the signing budget. */
export function claimOutcomeIsPartial(outcome: ClaimRouteOutcome): boolean {
  return outcome.excludedReasons?.includes('VELOCITY_LIMIT_DEFERRED') ?? false;
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
   * keys and mainnet Bitcoin accounts on this phone can. Solana, Tron,
   * hardware accounts, and keys that live on another device cannot.
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
        reason: unsignedChallengeReason(result.body.challenges),
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
        reason: unsignedChallengeReason(
          result.body.challenges.filter(
            (challenge) =>
              !deps.canSignEarningAddress(challenge.earning_address),
          ),
        ),
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
 * batch is confirmed on chain. The claim stays on the screen that started
 * it: the batch is already authorized, so this does not open a confirmation.
 *
 * The deposit call is not typed as `moneyAccountDeposit`: that type asks MM
 * Pay to quote a token the user holds, and this batch is funded by the
 * voucher instead.
 */
export async function submitClaimVoucher({
  voucher,
  vaultConfig,
  moneyAccountAddress,
  onBatchSubmitted,
  now = Date.now,
}: {
  voucher: ClaimVoucherDto;
  vaultConfig: MoneyAccountVaultConfig;
  moneyAccountAddress: string;
  /**
   * The batch id, once the wallet has accepted it. The settled trade banner
   * for this id is replaced by the rewards line.
   */
  onBatchSubmitted?: (batchId: string) => void;
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
      // disableHook and disableSequential put a Money Account on the EIP-7702
      // path, where an omitted requireApproval waits for a confirmation nobody
      // accepts. False submits the batch the Claim tap already authorized.
      await addTransactionBatch({
        batchId,
        disableHook: true,
        disableSequential: true,
        disableUpgrade: true,
        from: moneyAccountAddress as Hex,
        requireApproval: false,
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
      onBatchSubmitted?.(batchId);
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
