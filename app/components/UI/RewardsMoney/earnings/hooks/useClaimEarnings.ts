import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { bytesToHex, type Hex } from '@metamask/utils';
import { v4 as uuidv4, parse as uuidParse } from 'uuid';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { addTransactionBatch } from '../../../../../util/transaction-controller';
import { selectMoneyAccountVaultConfig } from '../../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { getProviderByChainId } from '../../../../../util/notifications/methods/common';
import { isMonadMainnetChainId } from '../../../../../util/networks';
import { buildClaimDepositBatch } from '../utils/buildClaimDepositBatch';
import type {
  ClaimVoucherDto,
  EarningOriginType,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { ClaimAlreadyOpenError } from '../../../../../core/Engine/controllers/rewards-money-controller/services';
import awaitBatchConfirmed, {
  BatchConfirmationFailedError,
  BatchConfirmationTimeoutError,
} from '../utils/awaitBatchConfirmed';

const LOG_TAG = '[Rewards Money Claim]';

/**
 * Settlement grace added on top of the voucher window, so a block landing on
 * the `valid_before` boundary is not called a timeout.
 */
const CONFIRMATION_GRACE_MS = 30_000;

/**
 * Why a claim attempt stopped. Each maps to its own copy, because "it failed"
 * is not actionable and these have genuinely different remedies.
 */
export type ClaimFailureReason =
  | 'NOT_SUBMITTABLE'
  | 'CLAIM_ALREADY_OPEN'
  | 'VOUCHER_EXPIRED'
  | 'NO_VOUCHER'
  | 'SUBMIT_FAILED'
  | 'CONFIRMATION_FAILED'
  | 'CONFIRMATION_TIMEOUT'
  | 'UNKNOWN';

export class ClaimError extends Error {
  readonly reason: ClaimFailureReason;

  constructor(reason: ClaimFailureReason, message: string) {
    super(message);
    this.name = 'ClaimError';
    this.reason = reason;
  }
}

export interface UseClaimEarningsResult {
  claim: (originTypes: EarningOriginType[]) => Promise<void>;
  isClaiming: boolean;
  /**
   * The batch is on chain but has not reached a terminal state yet. This is NOT
   * success — a submitted batch can still revert, so callers must not report a
   * completed claim on this alone.
   */
  hasSubmitted: boolean;
  /**
   * The batch reached `transactionConfirmed`. This is the only success signal;
   * it is what a caller should report and close on.
   */
  hasConfirmed: boolean;
  error: ClaimError | null;
  /**
   * Whether a claim can be submitted at all right now. Checked BEFORE the
   * voucher is requested, because a failure at signing time has already burned
   * the 60-second window.
   */
  isSubmittable: boolean;
  reset: () => void;
}

/**
 * Runs the claim: open the claim server-side, then submit the EIP-3009 →
 * approve → deposit batch that lands the mUSD in the user's Money Account.
 *
 * The client reports nothing back afterwards. Settlement is the reconciler's
 * job — it reads `authorizationState(treasury, nonce)` on chain and is the only
 * thing that can move a claim to SETTLED.
 *
 * @returns The claim callback plus its lifecycle state.
 */
export const useClaimEarnings = (): UseClaimEarningsResult => {
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);

  const [isClaiming, setIsClaiming] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [error, setError] = useState<ClaimError | null>(null);
  const inFlightRef = useRef(false);
  // Safety net only. The correctness fix is that success is reported on
  // confirmation rather than submission; this just stops a late settle writing
  // to an unmounted sheet.
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const chainIdHex = vaultConfig?.chainId as Hex | undefined;

  // Gas sponsorship for a 3-call batch through Sentinel is expected but
  // unconfirmed. Requiring it up front is what stops an unsponsored account
  // burning a 60-second voucher on a batch it cannot pay for.
  const isSubmittable = Boolean(
    vaultConfig &&
      primaryMoneyAccount?.address &&
      chainIdHex &&
      isMonadMainnetChainId(chainIdHex),
  );

  const reset = useCallback(() => {
    setError(null);
    setHasSubmitted(false);
    setHasConfirmed(false);
  }, []);

  const claim = useCallback(
    async (originTypes: EarningOriginType[]) => {
      if (inFlightRef.current) {
        return;
      }

      if (!isSubmittable || !vaultConfig || !primaryMoneyAccount?.address) {
        setError(
          new ClaimError(
            'NOT_SUBMITTABLE',
            'This account cannot submit a claim right now',
          ),
        );
        return;
      }

      const moneyAccountAddress = primaryMoneyAccount.address as Hex;
      const chainId = vaultConfig.chainId as Hex;
      const provider = getProviderByChainId(chainId);
      if (!provider) {
        setError(
          new ClaimError(
            'NOT_SUBMITTABLE',
            `No provider available for chain ${chainId}`,
          ),
        );
        return;
      }

      inFlightRef.current = true;
      setIsClaiming(true);
      setError(null);
      setHasSubmitted(false);
      setHasConfirmed(false);

      try {
        const result = await Engine.controllerMessenger.call(
          'RewardsMoneyController:initiateClaim',
          { moneyAccountAddress, originTypes },
        );

        const { voucher } = result;
        if (!voucher) {
          throw new ClaimError(
            'NO_VOUCHER',
            'The claim is awaiting release; retry shortly',
          );
        }

        assertVoucherIsLive(voucher);

        const amount = BigInt(voucher.value);
        const transactions = await buildClaimDepositBatch({
          amount,
          chainId,
          boringVault: vaultConfig.boringVault,
          tellerAddress: vaultConfig.tellerAddress,
          accountantAddress: vaultConfig.accountantAddress,
          lensAddress: vaultConfig.lensAddress,
          provider,
          authorization: {
            from: voucher.from as Hex,
            to: moneyAccountAddress,
            value: voucher.value,
            validAfter: voucher.valid_after,
            validBefore: voucher.valid_before,
            nonce: voucher.nonce as Hex,
            signature: voucher.signature as Hex,
          },
        });

        // Re-check immediately before submitting: building the batch makes an
        // RPC round trip, and a voucher that lapsed during it would revert
        // opaquely on chain rather than say why.
        assertVoucherIsLive(voucher);

        const batchId = bytesToHex(new Uint8Array(uuidParse(uuidv4())));
        const networkClientId =
          Engine.context.NetworkController.findNetworkClientIdByChainId(
            chainId,
          );
        if (!networkClientId) {
          throw new ClaimError(
            'NOT_SUBMITTABLE',
            `Network client not found for chain ${chainId}`,
          );
        }

        await awaitBatchConfirmed({
          messenger: Engine.controllerMessenger,
          // Bound the wait by the voucher, not by the 5-minute default. Once
          // `valid_before` passes, the authorization leg can no longer execute,
          // so a batch still unconfirmed after that plus a short settlement
          // grace is never going to succeed — and saying "timed out" then is
          // true, where a generic failure would not be.
          timeoutMs: confirmationTimeoutMs(voucher),
          submit: async () => {
            await addTransactionBatch({
              batchId,
              disableHook: true,
              disableSequential: true,
              disableUpgrade: true,
              from: moneyAccountAddress,
              isGasFeeSponsored: true,
              isInternal: true,
              networkClientId,
              origin: ORIGIN_METAMASK,
              // No `requiredAssets`: the authorization leg delivers the mUSD.
              // Declaring it here would have MM Pay fund the account a second
              // time for money the batch already brings with it.
              skipInitialGasEstimate: true,
              transactions,
            });
            if (isMountedRef.current) {
              setHasSubmitted(true);
            }
            return { batchId };
          },
        });

        // Only now is the claim a success. A submitted batch can still revert,
        // which is exactly what happens against a stub signer, so reporting
        // success at submission time told the user it worked when it had not.
        if (isMountedRef.current) {
          setHasConfirmed(true);
        }

        // The reconciler is the only thing that moves a claim to SETTLED, so
        // the server will lag this. Record what the claim paid so the earnings
        // screen holds the post-claim figure instead of flashing the pre-claim
        // one back while the server catches up.
        Engine.controllerMessenger.call(
          'RewardsMoneyController:recordOptimisticClaim',
          {
            netAmount: voucher.value,
            originTypes,
          },
        );
        Engine.controllerMessenger.call(
          'RewardsMoneyController:notifyEarningsUpdated',
        );
      } catch (err) {
        const claimError = toClaimError(err);
        Logger.log(`${LOG_TAG} claim failed`, claimError.message);
        if (isMountedRef.current) {
          setError(claimError);
        }
      } finally {
        inFlightRef.current = false;
        if (isMountedRef.current) {
          setIsClaiming(false);
        }
      }
    },
    [isSubmittable, primaryMoneyAccount?.address, vaultConfig],
  );

  return {
    claim,
    isClaiming,
    hasSubmitted,
    hasConfirmed,
    error,
    isSubmittable,
    reset,
  };
};

/**
 * Throws when the voucher's one-minute window has already closed, so expiry
 * surfaces as its own message instead of an opaque on-chain revert.
 *
 * @param voucher - The voucher to check.
 * @param now - Reference time in ms, injectable for tests.
 */
export function assertVoucherIsLive(
  voucher: ClaimVoucherDto,
  now: number = Date.now(),
): void {
  if (voucher.valid_before * 1000 <= now) {
    throw new ClaimError('VOUCHER_EXPIRED', 'The claim voucher has expired');
  }
}

/**
 * How long to wait for confirmation.
 *
 * The authorization leg cannot execute once `valid_before` passes, so the
 * voucher window plus a short settlement grace is the real upper bound. The
 * grace covers a block landing right on the boundary.
 *
 * @param voucher - The claim voucher.
 * @param now - Reference time in ms, injectable for tests.
 * @returns Timeout in milliseconds, never below the grace period.
 */
export function confirmationTimeoutMs(
  voucher: ClaimVoucherDto,
  now: number = Date.now(),
): number {
  const remaining = voucher.valid_before * 1000 - now;
  return Math.max(0, remaining) + CONFIRMATION_GRACE_MS;
}

function toClaimError(error: unknown): ClaimError {
  if (error instanceof ClaimError) {
    return error;
  }
  if (error instanceof ClaimAlreadyOpenError) {
    return new ClaimError(
      'CLAIM_ALREADY_OPEN',
      'A claim is already in progress',
    );
  }
  if (error instanceof BatchConfirmationTimeoutError) {
    return new ClaimError('CONFIRMATION_TIMEOUT', error.message);
  }
  if (error instanceof BatchConfirmationFailedError) {
    return new ClaimError('CONFIRMATION_FAILED', error.message);
  }
  return new ClaimError(
    'SUBMIT_FAILED',
    error instanceof Error ? error.message : String(error),
  );
}

export default useClaimEarnings;
