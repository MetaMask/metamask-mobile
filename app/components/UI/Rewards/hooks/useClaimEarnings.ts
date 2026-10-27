import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BtcAccountType } from '@metamask/keyring-api';
import { Hex } from '@metamask/utils';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Engine from '../../../../core/Engine';
import type { RootState } from '../../../../reducers';
import {
  setClaimLock,
  setClaimWaitingUntil,
} from '../../../../reducers/rewardsMoney';
import {
  selectClaimLock,
  selectClaimWaitingUntil,
  selectReferralMeLocalizedText,
  type MoneyDashboardPersona,
} from '../../../../reducers/rewardsMoney/selectors';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../selectors/featureFlagController/gasFeesSponsored';
import { isMonadMainnetChainId } from '../../../../util/networks';
import {
  getKeyringByAddress,
  isHardwareAccount,
  isSnapAccount,
} from '../../../../util/address';
import type {
  ClaimRouteSlug,
  ClaimVoucherDto,
  EarningsSummaryDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import useRewardsToast from './useRewardsToast';
import {
  claimRewardsNotification,
  clearSettledClaimBatchBanners,
  queueClaimRewardsInPlaceOfSettledBanner,
  suppressSettledClaimBatchBanner,
} from '../utils/claimBatchNotifications';
import {
  canClaimEarnings,
  claimFailureReason,
  claimOutcomeIsPartial,
  claimRoutesForSummary,
  claimToastKey,
  claimToastText,
  claimTypeForRoute,
  isClaimsPausedRefusal,
  evmAddressFromEarningAddress,
  bitcoinAddressFromEarningAddress,
  isClaimSubmittable,
  runEarningsClaim,
  signBitcoinClaimMessage,
  submitClaimVoucher,
  type ClaimRouteOutcome,
} from '../utils/claimEarnings';
import { reportRewardsMoneyReadFailure } from './reportRewardsMoneyReadFailure';

/** A mainnet `bc1q` or `bc1p` account this phone can BIP-322 sign. */
function bitcoinAccountForEarningAddress(earningAddress: string) {
  const bitcoin = bitcoinAddressFromEarningAddress(earningAddress);
  if (!bitcoin) {
    return null;
  }
  const account =
    Engine.context.AccountsController.getAccountByAddress(bitcoin);
  if (!account || account.address.toLowerCase() !== bitcoin) {
    return null;
  }
  const typeMatches =
    (account.type === BtcAccountType.P2wpkh && bitcoin.startsWith('bc1q')) ||
    (account.type === BtcAccountType.P2tr && bitcoin.startsWith('bc1p'));
  return typeMatches ? { account, bitcoin } : null;
}

function branchClaimKey(
  branch:
    | EarningsSummaryDto['self_earned']
    | EarningsSummaryDto['earned_by_others']
    | undefined,
): string {
  return Object.entries(branch?.by_claim_family ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, totals]) =>
      [
        name,
        totals.claimable ?? '',
        totals.held ?? '',
        totals.blocked ?? '',
        totals.pending,
        totals.claimed,
      ].join(':'),
    )
    .join(',');
}

/**
 * Claimable figures a later summary has to change before Claim is enabled
 * again. A new object with the same figures is still the pre-claim balance.
 */
export function earningsSummaryClaimKey(summary: EarningsSummaryDto): string {
  return [
    summary.claimable ?? '',
    summary.held ?? '',
    summary.blocked ?? '',
    summary.pending,
    summary.claimed,
    branchClaimKey(summary.self_earned),
    branchClaimKey(summary.earned_by_others),
  ].join('|');
}

/**
 * Claims referee cashback that reaches the summary minimum, signs the
 * challenges, and submits the voucher. The claim stays on the current
 * screen. "Transaction submitted" is left as it is. The rewards line
 * replaces the wallet's complete or failed banner, on success and when
 * confirmation fails or times out.
 */
export function useClaimEarnings(
  profileId: string,
  {
    persona,
    onOpened,
    onSubmitted,
    onClaimsPaused,
    summary: liveSummary = null,
  }: {
    persona?: MoneyDashboardPersona;
    onOpened?: () => void;
    /**
     * A whole-claim refusal that leaves money in `held` or `blocked`. The
     * caller opens the Claims paused sheet. No error toast.
     */
    onClaimsPaused?: () => void;
    /**
     * Runs after a confirmed claim, before Claim is enabled again. A rejection
     * means the balance on screen is still the pre-claim one, so Claim stays
     * disabled until a summary with different claimable figures arrives.
     */
    onSubmitted?: () => void | Promise<void>;
    /**
     * The summary currently on screen. A failed refresh stays locked until
     * these claimable figures change, including after the tab unmounts.
     */
    summary?: EarningsSummaryDto | null;
  } = {},
): {
  claim: (summary: EarningsSummaryDto) => Promise<void>;
  isClaiming: boolean;
  /** True until a refusal's `Retry-After` elapses. Claim stays disabled. */
  isClaimWaiting: boolean;
} {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const dispatch = useDispatch();
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const persistedWaitUntil = useSelector((state: RootState) =>
    selectClaimWaitingUntil(state, profileId),
  );
  const claimLock = useSelector((state: RootState) =>
    selectClaimLock(state, profileId),
  );
  const claimLockRef = useRef(claimLock);
  claimLockRef.current = claimLock;
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const isSponsorshipEnabled = useSelector(getGasFeesSponsoredNetworkEnabled);
  const [isClaiming, setIsClaiming] = useState(false);
  const storeWait =
    persistedWaitUntil !== undefined && persistedWaitUntil > Date.now()
      ? persistedWaitUntil
      : null;
  const [claimWaitingUntil, setClaimWaitingUntilState] = useState<
    number | null
  >(storeWait);
  // A refusal can write Retry-After after this hook unmounts. The store is
  // already updated when Earnings remounts, and a later write has to reach
  // the hook that is mounted now.
  const waitUntil = storeWait ?? claimWaitingUntil;
  const isClaimingRef = useRef(false);
  const rewardsNotificationTimer = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const claimWaitingUntilRef = useRef<number | null>(waitUntil);
  claimWaitingUntilRef.current = waitUntil;

  useEffect(() => {
    if (claimLock?.status !== 'awaiting_fresh_summary' || !liveSummary) {
      return;
    }
    if (earningsSummaryClaimKey(liveSummary) === claimLock.summaryKey) {
      return;
    }
    isClaimingRef.current = false;
    setIsClaiming(false);
    dispatch(setClaimLock({ profileId, lock: null }));
  }, [claimLock, dispatch, liveSummary, profileId]);

  useEffect(() => {
    setClaimWaitingUntilState(storeWait);
  }, [storeWait]);

  useEffect(() => {
    if (waitUntil === null) {
      return undefined;
    }
    const delay = waitUntil - Date.now();
    if (delay <= 0) {
      claimWaitingUntilRef.current = null;
      setClaimWaitingUntilState(null);
      dispatch(setClaimWaitingUntil({ profileId, until: null }));
      return undefined;
    }
    const timer = setTimeout(() => {
      claimWaitingUntilRef.current = null;
      setClaimWaitingUntilState(null);
      dispatch(setClaimWaitingUntil({ profileId, until: null }));
    }, delay);
    return () => clearTimeout(timer);
  }, [waitUntil, dispatch, profileId]);

  const claim = useCallback(
    async (summary: EarningsSummaryDto) => {
      const waitingUntil = claimWaitingUntilRef.current;
      if (
        !localizedText ||
        isClaimingRef.current ||
        claimLockRef.current != null ||
        (waitingUntil !== null && waitingUntil > Date.now()) ||
        !canClaimEarnings(summary, persona)
      ) {
        return;
      }
      isClaimingRef.current = true;
      setIsClaiming(true);
      if (rewardsNotificationTimer.current !== undefined) {
        clearTimeout(rewardsNotificationTimer.current);
        rewardsNotificationTimer.current = undefined;
      }
      const summaryKey = earningsSummaryClaimKey(summary);
      let lockArmed = false;
      let holdForFreshSummary = false;
      const startedAt = Date.now();
      const routes = claimRoutesForSummary(summary);
      let tracked = false;
      const durationMs = () => Math.max(0, Date.now() - startedAt);
      const trackFailed = (route: ClaimRouteSlug, failureReason: string) => {
        tracked = true;
        trackEvent(
          createEventBuilder(MetaMetricsEvents.REWARDS_MONEY_CLAIM_FAILED)
            .addProperties({
              claim_type: claimTypeForRoute(route),
              duration_ms: durationMs(),
              failure_reason: failureReason,
            })
            .build(),
        );
      };
      const trackCompleted = (outcome: ClaimRouteOutcome) => {
        tracked = true;
        trackEvent(
          createEventBuilder(MetaMetricsEvents.REWARDS_MONEY_CLAIM_COMPLETED)
            .addProperties({
              claim_type: claimTypeForRoute(outcome.route),
              duration_ms: durationMs(),
              partial: claimOutcomeIsPartial(outcome),
            })
            .build(),
        );
      };

      const fail = (key: ReturnType<typeof claimToastKey>) => {
        showToast(RewardsToastOptions.error(localizedText[key]));
      };

      try {
        const moneyAccountAddress = moneyAccount?.address;
        const chainId = vaultConfig?.chainId;
        if (
          !moneyAccountAddress ||
          !vaultConfig ||
          !isClaimSubmittable({
            moneyAccountAddress,
            chainId,
            isMonadMainnet: Boolean(
              chainId && isMonadMainnetChainId(chainId as Hex),
            ),
            isSponsored: Boolean(chainId && isSponsorshipEnabled(chainId)),
          })
        ) {
          routes.forEach((route) => trackFailed(route, 'not_submittable'));
          fail('claimFailureToast');
          return;
        }

        dispatch(
          setClaimLock({
            profileId,
            lock: { status: 'in_progress', summaryKey },
          }),
        );
        lockArmed = true;

        let submittedBatchId: string | undefined;
        const outcomes = await runEarningsClaim({
          moneyAccountAddress,
          routes,
          initiateClaim: (route, body) =>
            Engine.controllerMessenger.call(
              'RewardsMoneyController:initiateClaim',
              route,
              body,
            ),
          canSignEarningAddress: (earningAddress) => {
            if (bitcoinAccountForEarningAddress(earningAddress)) {
              return true;
            }
            const from = evmAddressFromEarningAddress(earningAddress);
            if (!from || !getKeyringByAddress(from)) {
              return false;
            }
            return !isHardwareAccount(from) && !isSnapAccount(from);
          },
          signMessage: async (message, earningAddress) => {
            const bitcoin = bitcoinAccountForEarningAddress(earningAddress);
            if (bitcoin) {
              return signBitcoinClaimMessage(
                bitcoin.account.id,
                bitcoin.bitcoin,
                message,
              );
            }
            const from = evmAddressFromEarningAddress(earningAddress);
            if (!from) {
              throw new Error('SIGN_FAILED');
            }
            const data = ('0x' +
              Buffer.from(message, 'utf8').toString('hex')) as Hex;
            try {
              return await Engine.context.KeyringController.signPersonalMessage(
                {
                  data,
                  from: from as Hex,
                },
              );
            } catch {
              throw new Error('SIGN_FAILED');
            }
          },
          submitVoucher: async (voucher: ClaimVoucherDto) => {
            await submitClaimVoucher({
              voucher,
              vaultConfig,
              moneyAccountAddress,
              onBatchSubmitted: (batchId) => {
                submittedBatchId = batchId;
              },
            });
          },
        });

        outcomes.forEach((outcome) => {
          if (outcome.submitted) {
            trackCompleted(outcome);
            return;
          }
          trackFailed(
            outcome.route,
            claimFailureReason(outcome.reason ?? 'UNKNOWN'),
          );
        });

        const key = claimToastKey(outcomes);
        const paid = outcomes.some((outcome) => outcome.submitted);
        const failedConfirmation = outcomes.some(
          (outcome) =>
            outcome.reason === 'CONFIRMATION_FAILED' ||
            outcome.reason === 'CONFIRMATION_TIMEOUT',
        );
        if (isClaimsPausedRefusal(outcomes)) {
          onClaimsPaused?.();
        } else if (
          key === 'claimSuccessToast' ||
          key === 'claimPartialSuccessToast' ||
          failedConfirmation
        ) {
          const title = claimToastText(localizedText, outcomes);
          if (submittedBatchId) {
            suppressSettledClaimBatchBanner(submittedBatchId);
          }
          const batchId = submittedBatchId;
          rewardsNotificationTimer.current =
            queueClaimRewardsInPlaceOfSettledBanner(() => {
              rewardsNotificationTimer.current = undefined;
              if (batchId) {
                for (const action of clearSettledClaimBatchBanners(batchId)) {
                  dispatch(action);
                }
              }
              dispatch(
                claimRewardsNotification(
                  `claim-rewards-${Date.now()}`,
                  title,
                  failedConfirmation ? 'error' : 'success',
                ),
              );
            });
        } else {
          showToast(
            RewardsToastOptions.error(claimToastText(localizedText, outcomes)),
          );
        }
        // Refresh after a paid claim, including one that left money in
        // `excluded[]`. The rewards line replaces the wallet's settled
        // banner. A failed refresh leaves the pre-claim balance on screen,
        // so Claim stays disabled until a later summary replaces it.
        if (paid) {
          try {
            await onSubmitted?.();
          } catch {
            holdForFreshSummary = true;
          }
        }
        if (outcomes.some((outcome) => outcome.opened)) {
          onOpened?.();
        }
        // A namespace this phone has no account for will fail the same way
        // on the next press. Claim stays disabled until a later summary
        // carries different claimable figures.
        if (
          !paid &&
          outcomes.some(
            (outcome) => outcome.reason === 'UNSUPPORTED_EARNING_ADDRESS',
          )
        ) {
          holdForFreshSummary = true;
        }
        if (holdForFreshSummary) {
          dispatch(
            setClaimLock({
              profileId,
              lock: { status: 'awaiting_fresh_summary', summaryKey },
            }),
          );
        }
        const retryAfterSeconds = outcomes.reduce(
          (longest, outcome) =>
            Math.max(longest, outcome.retryAfterSeconds ?? 0),
          0,
        );
        if (retryAfterSeconds > 0) {
          const until = Date.now() + retryAfterSeconds * 1000;
          claimWaitingUntilRef.current = until;
          setClaimWaitingUntilState(until);
          dispatch(setClaimWaitingUntil({ profileId, until }));
        }
      } catch (error) {
        if (!tracked) {
          routes.forEach((route) => trackFailed(route, 'other'));
        }
        reportRewardsMoneyReadFailure(
          error,
          'claimEarnings.failed',
          true,
          'rewards-money',
        );
        fail('claimFailureToast');
      } finally {
        if (!holdForFreshSummary) {
          if (lockArmed) {
            dispatch(setClaimLock({ profileId, lock: null }));
          }
          isClaimingRef.current = false;
          setIsClaiming(false);
        }
      }
    },
    [
      localizedText,
      persona,
      moneyAccount?.address,
      vaultConfig,
      isSponsorshipEnabled,
      onOpened,
      onSubmitted,
      onClaimsPaused,
      showToast,
      RewardsToastOptions,
      dispatch,
      profileId,
      trackEvent,
      createEventBuilder,
    ],
  );

  return {
    claim,
    isClaiming: isClaiming || claimLock != null,
    isClaimWaiting: waitUntil !== null && waitUntil > Date.now(),
  };
}
