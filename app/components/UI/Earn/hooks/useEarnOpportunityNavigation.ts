import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { TokenDetailsSource } from '../../TokenDetails/constants/constants';
import type {
  EarnAsset,
  EarnExperience,
  HeldEarnAsset,
} from '../types/earnAssets';
import {
  earnAssetToToken,
  getMoneyDepositPaymentToken,
} from '../utils/earnAssets';
import { isEarnAssetBalanceBelowMinDepositAmount } from '../utils/earnAssets/earnAssetBalance';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../../../core/Engine';
import useStakingChain from '../../Stake/hooks/useStakingChain';
import { useMoneyOnboardingNavigation } from '../../Money/hooks/useMoneyNavigation';
import { MoneyPostOnboardingRedirectType } from '../../Money/types/navigation';
import { useMoneyAccountDeposit } from '../../Money/hooks/useMoneyAccount';
import Logger from '../../../../util/Logger';
import useEarnToasts from './useEarnToasts';
import { EARN_MODULE_REDIRECT_TARGETS } from '../constants/earnModuleEvents';
import type { EarnModuleNavigationContext } from '../types/earnModuleEvents.types';

const LOG_PREFIX = '[useEarnOpportunityNavigation]';

export type EarnOpportunityDestination =
  | EARN_MODULE_REDIRECT_TARGETS.TOKEN_DETAILS
  | EARN_MODULE_REDIRECT_TARGETS.POOLED_STAKING_DEPOSIT
  | EARN_MODULE_REDIRECT_TARGETS.STABLECOIN_LENDING_DEPOSIT
  | EARN_MODULE_REDIRECT_TARGETS.TRX_STAKING_DEPOSIT
  | EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT
  | EARN_MODULE_REDIRECT_TARGETS.STRATEGY_SELECTION_BOTTOM_SHEET;

export type EarnOpportunityRedirectTarget =
  | EarnOpportunityDestination
  | EARN_MODULE_REDIRECT_TARGETS.MONEY_ONBOARDING;

export const getEarnOpportunityDestination = (
  earnAsset: EarnAsset,
): EarnOpportunityDestination => {
  if (isEarnAssetBalanceBelowMinDepositAmount(earnAsset)) {
    return EARN_MODULE_REDIRECT_TARGETS.TOKEN_DETAILS;
  }

  if (earnAsset.experiences.length === 0) {
    throw new Error(`${LOG_PREFIX} Earn asset has no eligible experiences`);
  }

  if (earnAsset.experiences.length > 1) {
    return EARN_MODULE_REDIRECT_TARGETS.STRATEGY_SELECTION_BOTTOM_SHEET;
  }

  const singleSupportedExperienceType = earnAsset.experiences[0]?.type;

  switch (singleSupportedExperienceType) {
    case 'MONEY_ACCOUNT_DEPOSIT':
      return EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT;
    case EARN_EXPERIENCES.POOLED_STAKING:
      return EARN_MODULE_REDIRECT_TARGETS.POOLED_STAKING_DEPOSIT;
    case EARN_EXPERIENCES.STABLECOIN_LENDING:
      return EARN_MODULE_REDIRECT_TARGETS.STABLECOIN_LENDING_DEPOSIT;
    case EARN_EXPERIENCES.TRX_STAKING:
      return EARN_MODULE_REDIRECT_TARGETS.TRX_STAKING_DEPOSIT;
  }
};

export const getEarnOpportunityRedirectTarget = (
  earnAsset: EarnAsset,
  isMoneyOnboardingRedirectNeeded: boolean,
): EarnOpportunityRedirectTarget => {
  const destination = getEarnOpportunityDestination(earnAsset);

  return destination === EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT &&
    isMoneyOnboardingRedirectNeeded
    ? EARN_MODULE_REDIRECT_TARGETS.MONEY_ONBOARDING
    : destination;
};

export const getEarnExperienceRedirectTarget = (
  experience: EarnExperience,
  isMoneyOnboardingRedirectNeeded: boolean,
):
  | EARN_MODULE_REDIRECT_TARGETS.MONEY_ONBOARDING
  | EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT
  | EARN_MODULE_REDIRECT_TARGETS.POOLED_STAKING_DEPOSIT
  | EARN_MODULE_REDIRECT_TARGETS.STABLECOIN_LENDING_DEPOSIT
  | EARN_MODULE_REDIRECT_TARGETS.TRX_STAKING_DEPOSIT => {
  switch (experience.type) {
    case 'MONEY_ACCOUNT_DEPOSIT':
      return isMoneyOnboardingRedirectNeeded
        ? EARN_MODULE_REDIRECT_TARGETS.MONEY_ONBOARDING
        : EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT;
    case EARN_EXPERIENCES.POOLED_STAKING:
      return EARN_MODULE_REDIRECT_TARGETS.POOLED_STAKING_DEPOSIT;
    case EARN_EXPERIENCES.STABLECOIN_LENDING:
      return EARN_MODULE_REDIRECT_TARGETS.STABLECOIN_LENDING_DEPOSIT;
    case EARN_EXPERIENCES.TRX_STAKING:
      return EARN_MODULE_REDIRECT_TARGETS.TRX_STAKING_DEPOSIT;
  }
};

/**
 * Navigates an Earn opportunity to strategy selection or Token Details based
 * on whether the asset meets the minimum deposit amount.
 *
 * @param tokenDetailsSource - Attribution source for Token Details navigation.
 * @returns Earn opportunity navigation callback.
 */
const useEarnOpportunityNavigation = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { showToast, EarnToastOptions } = useEarnToasts();
  const { isStakingSupportedChain } = useStakingChain();
  const { redirectToOnboardingIfNeeded } = useMoneyOnboardingNavigation();
  const { initiateDeposit } = useMoneyAccountDeposit();

  /**
   * Navigation to legacy EarnInputView screen.
   * Used for pooled-staking and stablecoin lending experiences.
   */
  const navigateToLegacyEarnDeposit = useCallback(
    (earnAsset: HeldEarnAsset) => {
      const token = earnAssetToToken(earnAsset);

      navigation.navigate('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: {
          token,
        },
      });
    },
    [navigation],
  );

  const navigateToStablecoinLending = useCallback(
    async (earnAsset: HeldEarnAsset) => {
      const { asset } = earnAsset;

      if (!asset?.chainId) {
        throw new Error(
          `${LOG_PREFIX} Stablecoin lending redirect failed: chainId is required`,
        );
      }

      const networkClientId =
        Engine.context.NetworkController.findNetworkClientIdByChainId(
          toHex(asset.chainId),
        );

      if (!networkClientId) {
        const errorMessage = `Stablecoin lending redirect failed: could not retrieve networkClientId for chainId: ${asset.chainId}`;
        Logger.error(new Error(errorMessage));
        throw new Error(errorMessage);
      }

      await Engine.context.NetworkController.setActiveNetwork(networkClientId);

      navigateToLegacyEarnDeposit(earnAsset);
    },
    [navigateToLegacyEarnDeposit],
  );

  const navigateToPooledStaking = useCallback(
    async (earnAsset: HeldEarnAsset) => {
      if (!isStakingSupportedChain) {
        await Engine.context.MultichainNetworkController.setActiveNetwork(
          'mainnet',
        );
      }

      navigateToLegacyEarnDeposit(earnAsset);
    },
    [isStakingSupportedChain, navigateToLegacyEarnDeposit],
  );

  const navigateToMoneyDeposit = useCallback(
    async (earnAsset: HeldEarnAsset) => {
      const preferredPaymentToken = getMoneyDepositPaymentToken(earnAsset);

      const redirectedToOnboarding = redirectToOnboardingIfNeeded({
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.DEPOSIT,
          preferredPaymentToken,
        },
      });

      if (redirectedToOnboarding) {
        return;
      }

      try {
        await initiateDeposit({
          preferredPaymentToken,
          intent: 'convert',
          onDepositSetupFailure: () =>
            showToast(
              EarnToastOptions.earnStrategySelection.navigationToDeposit,
            ),
        });
      } catch (error) {
        Logger.error(
          error as Error,
          `${LOG_PREFIX} Failed to initiate Money deposit`,
        );
      }
    },
    [
      EarnToastOptions.earnStrategySelection.navigationToDeposit,
      initiateDeposit,
      redirectToOnboardingIfNeeded,
      showToast,
    ],
  );

  const navigateToDepositForExperience = useCallback(
    async (earnAsset: EarnAsset, experience: EarnExperience) => {
      if (earnAsset.kind !== 'held') {
        throw new Error(
          `${LOG_PREFIX} Deposit redirect is only supported for held assets`,
        );
      }

      switch (experience.type) {
        case 'MONEY_ACCOUNT_DEPOSIT':
          await navigateToMoneyDeposit(earnAsset);
          break;
        case EARN_EXPERIENCES.STABLECOIN_LENDING:
          await navigateToStablecoinLending(earnAsset);
          break;
        case EARN_EXPERIENCES.POOLED_STAKING:
          await navigateToPooledStaking(earnAsset);
          break;
        case EARN_EXPERIENCES.TRX_STAKING:
          navigateToLegacyEarnDeposit(earnAsset);
          break;
        default:
          throw new Error(
            `${LOG_PREFIX} Unsupported Earn experience: ${experience.type}`,
          );
      }
    },
    [
      navigateToMoneyDeposit,
      navigateToPooledStaking,
      navigateToStablecoinLending,
      navigateToLegacyEarnDeposit,
    ],
  );

  const navigateFromEarnAsset = useCallback(
    (
      asset: EarnAsset,
      tokenDetailsSource?: TokenDetailsSource,
      analyticsContext?: EarnModuleNavigationContext,
    ) => {
      if (!asset) {
        return;
      }

      const destination = getEarnOpportunityDestination(asset);

      if (destination === EARN_MODULE_REDIRECT_TARGETS.TOKEN_DETAILS) {
        const token = earnAssetToToken(asset);
        navigation.navigate('Asset', {
          ...token,
          source: tokenDetailsSource,
        });
        return;
      }

      if (
        destination === EARN_MODULE_REDIRECT_TARGETS.POOLED_STAKING_DEPOSIT ||
        destination ===
          EARN_MODULE_REDIRECT_TARGETS.STABLECOIN_LENDING_DEPOSIT ||
        destination === EARN_MODULE_REDIRECT_TARGETS.TRX_STAKING_DEPOSIT ||
        destination === EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT
      ) {
        navigateToDepositForExperience(asset, asset.experiences[0]).catch(
          (error: Error) => {
            showToast(
              EarnToastOptions.earnStrategySelection.navigationToDeposit,
            );
            Logger.error(
              error,
              `${LOG_PREFIX} Failed to navigate to deposit screen`,
            );
          },
        );
        return;
      }

      navigation.navigate(Routes.EARN.MODALS.ROOT, {
        screen: Routes.EARN.MODALS.STRATEGY_SELECTION,
        params: {
          earnAsset: asset,
          ...(analyticsContext ? { analyticsContext } : {}),
        },
      });
    },
    [
      navigation,
      navigateToDepositForExperience,
      showToast,
      EarnToastOptions.earnStrategySelection.navigationToDeposit,
    ],
  );

  return {
    navigateFromEarnAsset,
    navigateToDepositForExperience,
  };
};

export default useEarnOpportunityNavigation;
