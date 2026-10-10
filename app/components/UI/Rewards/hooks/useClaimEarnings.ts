import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import type { RootState } from '../../../../reducers';
import { selectReferralMeLocalizedText } from '../../../../reducers/rewardsMoney/selectors';
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
  ClaimVoucherDto,
  EarningsSummaryDto,
  ReferralVariant,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import useRewardsToast from './useRewardsToast';
import {
  canClaimEarnings,
  claimRoutesForSummary,
  claimToastKey,
  evmAddressFromEarningAddress,
  isClaimSubmittable,
  runEarningsClaim,
  submitClaimVoucher,
} from '../utils/claimEarnings';

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function isClaimConfirmationActive(): boolean {
  return (
    NavigationService.navigation.getCurrentRoute()?.name ===
    Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS
  );
}

/**
 * Claims referee cashback that clears $1, signs the challenges, and submits
 * the voucher. One toast, after the batch is submitted or the route has failed.
 */
export function useClaimEarnings(
  profileId: string,
  {
    variant,
    onOpened,
    onSubmitted,
    summary: liveSummary = null,
  }: {
    variant?: ReferralVariant;
    onOpened?: () => void;
    /**
     * Runs after a confirmed claim, before Claim is enabled again. A rejection
     * means the balance on screen is still the pre-claim one, so Claim stays
     * disabled until `summary` is replaced.
     */
    onSubmitted?: () => void | Promise<void>;
    /** The summary currently on screen. A new object releases a failed refresh. */
    summary?: EarningsSummaryDto | null;
  } = {},
): {
  claim: (summary: EarningsSummaryDto) => Promise<void>;
  isClaiming: boolean;
  /** True until a refusal's `Retry-After` elapses. Claim stays disabled. */
  isClaimWaiting: boolean;
} {
  const navigation = useNavigation<AppNavigationProp>();
  const { navigateToConfirmation } = useConfirmNavigation();
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const isSponsorshipEnabled = useSelector(getGasFeesSponsoredNetworkEnabled);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimWaitingUntil, setClaimWaitingUntil] = useState<number | null>(
    null,
  );
  const isClaimingRef = useRef(false);
  const claimWaitingUntilRef = useRef<number | null>(null);
  /** The summary object Claim was pressed against, when its refresh failed. */
  const claimedSummaryRef = useRef<EarningsSummaryDto | null>(null);
  const refreshHoldRef = useRef(false);

  useEffect(() => {
    if (!refreshHoldRef.current) {
      return;
    }
    if (!liveSummary || liveSummary === claimedSummaryRef.current) {
      return;
    }
    refreshHoldRef.current = false;
    isClaimingRef.current = false;
    setIsClaiming(false);
  }, [liveSummary]);

  useEffect(() => {
    if (claimWaitingUntil === null) {
      return undefined;
    }
    const delay = claimWaitingUntil - Date.now();
    if (delay <= 0) {
      claimWaitingUntilRef.current = null;
      setClaimWaitingUntil(null);
      return undefined;
    }
    const timer = setTimeout(() => {
      claimWaitingUntilRef.current = null;
      setClaimWaitingUntil(null);
    }, delay);
    return () => clearTimeout(timer);
  }, [claimWaitingUntil]);

  const claim = useCallback(
    async (summary: EarningsSummaryDto) => {
      const waitingUntil = claimWaitingUntilRef.current;
      if (
        !localizedText ||
        isClaimingRef.current ||
        (waitingUntil !== null && waitingUntil > Date.now()) ||
        !canClaimEarnings(summary, variant)
      ) {
        return;
      }
      isClaimingRef.current = true;
      setIsClaiming(true);
      let refreshHold = false;

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
          fail('claimFailureToast');
          return;
        }

        const outcomes = await runEarningsClaim({
          moneyAccountAddress,
          routes: claimRoutesForSummary(summary),
          initiateClaim: (route, body) =>
            Engine.controllerMessenger.call(
              'RewardsMoneyController:initiateClaim',
              route,
              body,
            ),
          canSignEarningAddress: (earningAddress) => {
            const from = evmAddressFromEarningAddress(earningAddress);
            if (!from || !getKeyringByAddress(from)) {
              return false;
            }
            return !isHardwareAccount(from) && !isSnapAccount(from);
          },
          signMessage: async (message, earningAddress) => {
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
            navigateToConfirmation({
              stack: Routes.MONEY.CONFIRMATIONS_ROOT,
            });
            await waitForNextFrame();
            try {
              await submitClaimVoucher({
                voucher,
                vaultConfig,
                moneyAccountAddress,
              });
            } catch (error) {
              if (isClaimConfirmationActive()) {
                navigation.goBack();
              }
              throw error;
            }
          },
        });

        const key = claimToastKey(outcomes);
        const paid = outcomes.some((outcome) => outcome.submitted);
        if (key === 'claimSuccessToast' || key === 'claimPartialSuccessToast') {
          showToast(RewardsToastOptions.success(localizedText[key]));
        } else {
          showToast(RewardsToastOptions.error(localizedText[key]));
        }
        // Refresh after a paid claim, including one that left money in
        // `excluded[]`. The success toast already won. A failed refresh leaves
        // the pre-claim balance on screen, so Claim stays disabled until a
        // later summary replaces it.
        if (paid) {
          try {
            await onSubmitted?.();
          } catch {
            refreshHold = true;
            refreshHoldRef.current = true;
            claimedSummaryRef.current = summary;
          }
        }
        if (outcomes.some((outcome) => outcome.opened)) {
          onOpened?.();
        }
        const retryAfterSeconds = outcomes.reduce(
          (longest, outcome) =>
            Math.max(longest, outcome.retryAfterSeconds ?? 0),
          0,
        );
        if (retryAfterSeconds > 0) {
          const until = Date.now() + retryAfterSeconds * 1000;
          claimWaitingUntilRef.current = until;
          setClaimWaitingUntil(until);
        }
      } catch {
        fail('claimFailureToast');
      } finally {
        if (!refreshHold) {
          isClaimingRef.current = false;
          setIsClaiming(false);
        }
      }
    },
    [
      localizedText,
      variant,
      moneyAccount?.address,
      vaultConfig,
      isSponsorshipEnabled,
      navigation,
      navigateToConfirmation,
      onOpened,
      onSubmitted,
      showToast,
      RewardsToastOptions,
    ],
  );

  return {
    claim,
    isClaiming,
    isClaimWaiting:
      claimWaitingUntil !== null && claimWaitingUntil > Date.now(),
  };
}
