import { useCallback, useRef, useState } from 'react';
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
import {
  buildMoneyAccountDepositBatch,
  getMoneyAccountDepositCalls,
} from '../../../Money/utils/moneyAccountTransactions';
import type {
  ClaimVoucherDto,
  EarningOriginType,
} from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { ClaimAlreadyOpenError } from '../../../../../core/Engine/controllers/rewards-money-controller/services';
import awaitBatchConfirmed from '../utils/awaitBatchConfirmed';

const LOG_TAG = '[Rewards Money Claim]';

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
   * True once the batch is submitted. The backend lags the chain — only the
   * reconciler moves a claim to SETTLED — so callers hold this optimistic state
   * rather than flashing the pre-claim balance back.
   */
  hasSubmitted: boolean;
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
  const [error, setError] = useState<ClaimError | null>(null);
  const inFlightRef = useRef(false);

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
        const batch = await buildMoneyAccountDepositBatch({
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

        const transactions = getMoneyAccountDepositCalls(batch).map(
          ({ tx }) => tx,
        );
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
            setHasSubmitted(true);
            return { batchId };
          },
        });

        Engine.controllerMessenger.call(
          'RewardsMoneyController:invalidateRewardsMoneyCache',
        );
        Engine.controllerMessenger.call(
          'RewardsMoneyController:notifyEarningsUpdated',
        );
      } catch (err) {
        const claimError = toClaimError(err);
        Logger.log(`${LOG_TAG} claim failed`, claimError.message);
        setError(claimError);
      } finally {
        inFlightRef.current = false;
        setIsClaiming(false);
      }
    },
    [isSubmittable, primaryMoneyAccount?.address, vaultConfig],
  );

  return { claim, isClaiming, hasSubmitted, error, isSubmittable, reset };
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
  return new ClaimError(
    'SUBMIT_FAILED',
    error instanceof Error ? error.message : String(error),
  );
}

export default useClaimEarnings;
