import { useCallback, useRef, useState } from 'react';
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
  }: {
    variant?: ReferralVariant;
    onOpened?: () => void;
    onSubmitted?: () => void;
  } = {},
): {
  claim: (summary: EarningsSummaryDto) => Promise<void>;
  isClaiming: boolean;
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
  const isClaimingRef = useRef(false);

  const claim = useCallback(
    async (summary: EarningsSummaryDto) => {
      if (
        !localizedText ||
        isClaimingRef.current ||
        !canClaimEarnings(summary, variant)
      ) {
        return;
      }
      isClaimingRef.current = true;
      setIsClaiming(true);

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
          signMessage: async (message, earningAddress) => {
            const from = evmAddressFromEarningAddress(earningAddress);
            if (!from) {
              throw new Error('SIGN_FAILED');
            }
            const data = ('0x' +
              Buffer.from(message, 'utf8').toString('hex')) as Hex;
            return Engine.context.KeyringController.signPersonalMessage({
              data,
              from: from as Hex,
            });
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
        if (key === 'claimSuccessToast') {
          showToast(RewardsToastOptions.success(localizedText[key]));
          onSubmitted?.();
        } else {
          showToast(RewardsToastOptions.error(localizedText[key]));
        }
        if (outcomes.some((outcome) => outcome.opened)) {
          onOpened?.();
        }
      } catch {
        fail('claimFailureToast');
      } finally {
        isClaimingRef.current = false;
        setIsClaiming(false);
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

  return { claim, isClaiming };
}
