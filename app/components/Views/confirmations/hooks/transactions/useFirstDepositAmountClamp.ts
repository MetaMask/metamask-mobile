import { useEffect, useRef, useState } from 'react';
import { BigNumber } from 'bignumber.js';
import { TransactionMeta } from '@metamask/transaction-controller';
import Logger from '../../../../../util/Logger';
import {
  isLighterAccountCreationDeposit,
  LIGHTER_FIRST_DEPOSIT_CAP_PERCENTAGE,
} from '../../temp-lighter/lighter-usdc-deposit';

const MAX_CLAMP_COMMIT_RETRIES = 3;
const CLAMP_RETRY_BACKOFF_MS = 500;

/**
 * Fiat cap for a first Lighter deposit. The cap leaves a gas buffer so
 * approve-plus-deposit does not consume the entire balance.
 *
 * @param balanceUsd - Current balance in USD.
 * @returns Cap in USD, rounded down to cents.
 */
function firstDepositCap(balanceUsd: number | string): BigNumber {
  return new BigNumber(balanceUsd)
    .multipliedBy(LIGHTER_FIRST_DEPOSIT_CAP_PERCENTAGE)
    .dividedBy(100)
    .decimalPlaces(2, BigNumber.ROUND_DOWN);
}

/**
 * Clamps an amount to the first-deposit cap when this is a Lighter account
 * creation deposit.
 *
 * @param amountFiat - Fiat amount to clamp.
 * @param balanceUsd - Current balance in USD.
 * @param transactionMeta - Transaction metadata.
 * @returns Clamped amount, or the original amount if no cap applies.
 */
function clampToFirstDepositCap(
  amountFiat: string,
  balanceUsd: number | string | undefined,
  transactionMeta: TransactionMeta | undefined,
): string {
  if (
    !balanceUsd ||
    !transactionMeta ||
    !isLighterAccountCreationDeposit(transactionMeta)
  ) {
    return amountFiat;
  }

  const amount = new BigNumber(amountFiat);
  const cap = firstDepositCap(balanceUsd);

  if (amount.isGreaterThan(cap)) {
    return cap.toString(10);
  }

  return amountFiat;
}

/**
 * True when the keypad already shows the first-deposit cap. A later provider
 * switch still has to write that cap: the new confirmation is built from the
 * last committed amount, which can still be the uncapped Max.
 *
 * @param amountFiat - Fiat amount on the keypad.
 * @param balanceUsd - Current balance in USD.
 * @param transactionMeta - Transaction metadata.
 * @returns Whether the keypad is sitting on the cap.
 */
function isAtFirstDepositCap(
  amountFiat: string,
  balanceUsd: number | string | undefined,
  transactionMeta: TransactionMeta | undefined,
): boolean {
  if (
    !balanceUsd ||
    !transactionMeta ||
    !isLighterAccountCreationDeposit(transactionMeta)
  ) {
    return false;
  }

  return new BigNumber(amountFiat).isEqualTo(firstDepositCap(balanceUsd));
}

/**
 * Keeps a replaced confirmation's amount, and commits the first-deposit cap
 * onto that confirmation. The screen stays mounted across a Perps provider
 * switch, so the keypad amount has to be written onto the new transaction.
 *
 * @param params - Amount, balance, and the replacement refs owned by the keypad.
 * @param params.amountFiat - Fiat amount on the keypad.
 * @param params.amountHumanFromFiat - Converts a fiat amount to the pay-token amount.
 * @param params.balanceUsd - Current balance in USD.
 * @param params.ignoreNextAutomaticTokenChangeRef - Set so the automatic token
 * change that follows a provider switch does not clear the kept amount.
 * @param params.keepAmountAfterReplacementRef - Set so prefill does not
 * overwrite the kept amount.
 * @param params.setAmountFiat - Updates the keypad amount.
 * @param params.skipFiatRateConversion - When true, the fiat amount is already the token amount.
 * @param params.tokenFiatRate - Fiat value of one pay token. Absent until the rate loads.
 * @param params.transactionId - Open confirmation id.
 * @param params.transactionMeta - Open confirmation.
 * @param params.updateTransactionPayAmount - Writes the pay amount onto the confirmation.
 * @returns Whether a cap commit is in flight or has exhausted its retries.
 */
export function useFirstDepositAmountClamp({
  amountFiat,
  amountHumanFromFiat,
  balanceUsd,
  ignoreNextAutomaticTokenChangeRef,
  keepAmountAfterReplacementRef,
  setAmountFiat,
  skipFiatRateConversion,
  tokenFiatRate,
  transactionId,
  transactionMeta,
  updateTransactionPayAmount,
}: {
  amountFiat: string;
  amountHumanFromFiat: (amountFiat: string) => string;
  balanceUsd: number | undefined;
  ignoreNextAutomaticTokenChangeRef: { current: boolean };
  keepAmountAfterReplacementRef: { current: boolean };
  setAmountFiat: (amountFiat: string) => void;
  skipFiatRateConversion: boolean;
  tokenFiatRate: number | undefined;
  transactionId: string;
  transactionMeta: TransactionMeta | undefined;
  updateTransactionPayAmount: (amountHuman: string) => Promise<boolean>;
}): {
  isClampCommitFailed: boolean;
  isClampCommitPending: boolean;
} {
  const previousTransactionIdRef = useRef(transactionId);
  const pendingClampRef = useRef(false);
  const clampCommitInFlightRef = useRef(false);
  const clampRetryAttemptsRef = useRef(0);
  const clampRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // Bumped on each confirmation replacement so an in-flight commit from the
  // previous transaction cannot clear the new attempt.
  const clampCommitGenerationRef = useRef(0);
  const [clampRetryCounter, setClampRetryCounter] = useState(0);
  const [isClampCommitPending, setIsClampCommitPending] = useState(false);
  const [isClampCommitFailed, setIsClampCommitFailed] = useState(false);

  useEffect((): void => {
    if (previousTransactionIdRef.current === transactionId) {
      return;
    }

    previousTransactionIdRef.current = transactionId;

    // Drop the previous attempt before arming the new one. Clearing the
    // pending flag after this would skip the cap commit.
    if (clampRetryTimeoutRef.current) {
      clearTimeout(clampRetryTimeoutRef.current);
      clampRetryTimeoutRef.current = null;
    }
    clampCommitGenerationRef.current += 1;
    clampCommitInFlightRef.current = false;
    clampRetryAttemptsRef.current = 0;
    setIsClampCommitPending(false);
    setIsClampCommitFailed(false);

    if (amountFiat !== '0') {
      keepAmountAfterReplacementRef.current = true;
      pendingClampRef.current = true;
      ignoreNextAutomaticTokenChangeRef.current = true;
    } else {
      pendingClampRef.current = false;
    }
  }, [
    amountFiat,
    ignoreNextAutomaticTokenChangeRef,
    keepAmountAfterReplacementRef,
    transactionId,
  ]);

  // Commit once per replacement, deferring until the balance, fiat rate, and
  // new confirmation are available. keepAmountAfterReplacementRef stays true
  // until a genuine pay-token change or manual edit clears it.
  useEffect((): void => {
    if (
      !pendingClampRef.current ||
      amountFiat === '0' ||
      !balanceUsd ||
      !transactionMeta
    ) {
      return;
    }

    // Wait for tokenFiatRate (or skipFiatRateConversion) before proceeding, so
    // we don't commit a zero amount. The effect retries when the rate loads.
    if (!tokenFiatRate && !skipFiatRateConversion) {
      return;
    }

    if (clampCommitInFlightRef.current) {
      return;
    }

    const clampedAmount = clampToFirstDepositCap(
      amountFiat,
      balanceUsd,
      transactionMeta,
    );

    const needsKeypadUpdate = clampedAmount !== amountFiat;
    // The keypad can already show the cap while the previous commit is in
    // flight or has failed. The replacement confirmation is still built from
    // the uncapped amount, so write the cap again.
    const needsCommit =
      needsKeypadUpdate ||
      isAtFirstDepositCap(amountFiat, balanceUsd, transactionMeta);

    if (needsCommit) {
      if (needsKeypadUpdate) {
        setAmountFiat(clampedAmount);
      }

      const clampedAmountHuman = amountHumanFromFiat(clampedAmount);
      clampCommitInFlightRef.current = true;
      setIsClampCommitPending(true);
      const commitGeneration = clampCommitGenerationRef.current;

      const commitClampedAmount = async (): Promise<void> => {
        try {
          await updateTransactionPayAmount(clampedAmountHuman);
          if (clampCommitGenerationRef.current !== commitGeneration) {
            return;
          }
          pendingClampRef.current = false;
          clampCommitInFlightRef.current = false;
          setIsClampCommitPending(false);
          clampRetryAttemptsRef.current = 0;
          setIsClampCommitFailed(false);
        } catch (error: unknown) {
          if (clampCommitGenerationRef.current !== commitGeneration) {
            return;
          }
          Logger.error(
            error as Error,
            'Failed to update transaction pay amount with clamped value',
          );
          clampCommitInFlightRef.current = false;
          // Hold the ref false during backoff so this effect does not start
          // another commit before the timeout. The timeout sets it true again.
          pendingClampRef.current = false;
          setIsClampCommitPending(false);

          if (clampRetryAttemptsRef.current >= MAX_CLAMP_COMMIT_RETRIES) {
            setIsClampCommitFailed(true);
            Logger.error(
              new Error('Clamp commit retry limit reached'),
              'Failed to commit clamped amount after retries',
            );
          } else {
            clampRetryAttemptsRef.current += 1;
            if (clampRetryTimeoutRef.current) {
              clearTimeout(clampRetryTimeoutRef.current);
            }
            clampRetryTimeoutRef.current = setTimeout((): void => {
              pendingClampRef.current = true;
              setClampRetryCounter((previous: number): number => previous + 1);
            }, CLAMP_RETRY_BACKOFF_MS);
          }
        }
      };

      commitClampedAmount().catch((error: unknown): void => {
        Logger.error(
          error as Error,
          'Unexpected error in clamp commit handler',
        );
      });
    } else if (!clampCommitInFlightRef.current) {
      pendingClampRef.current = false;
    }
  }, [
    amountFiat,
    amountHumanFromFiat,
    balanceUsd,
    clampRetryCounter,
    setAmountFiat,
    skipFiatRateConversion,
    tokenFiatRate,
    transactionMeta,
    updateTransactionPayAmount,
  ]);

  return { isClampCommitFailed, isClampCommitPending };
}
