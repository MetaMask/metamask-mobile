import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { TokenDetailsSource } from '../../TokenDetails/constants/constants';
import type { EarnAsset, EarnExperience } from '../types/earnAssets';
import {
  earnAssetToToken,
  getAvailableEarnDepositExperiences,
  getEarnInputExperiences,
  getMoneyDepositPaymentToken,
  requireTrackedEarnAsset,
} from '../utils/earnAssets';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../../../core/Engine';
import useStakingChain from '../../Stake/hooks/useStakingChain';
import { useMoneyAccountDeposit } from '../../Money/hooks/useMoneyAccount';
import { isUserRejectedError } from '../../../../util/errorHandling/isUserRejectedError';
import Logger from '../../../../util/Logger';
import useEarnToasts from './useEarnToasts';
import { EARN_MODULE_REDIRECT_TARGETS } from '../constants/earnModuleEvents';
import type { EarnModuleNavigationContext } from '../types/earnModuleEvents.types';
import useEarnAssetAcquisitionNavigation, {
  type EarnAssetAcquisitionRoute,
} from './useEarnAssetAcquisitionNavigation';

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
  | EARN_MODULE_REDIRECT_TARGETS.MONEY_ONBOARDING
  | EARN_MODULE_REDIRECT_TARGETS.SWAP
  | EARN_MODULE_REDIRECT_TARGETS.BUY;

export type EarnDepositNavigationRoute =
  | {
      type: 'money-fiat';
      redirectTarget: EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT;
    }
  | EarnAssetAcquisitionRoute;

type EarnExperienceDepositDestination = Exclude<
  EarnOpportunityDestination,
  | EARN_MODULE_REDIRECT_TARGETS.TOKEN_DETAILS
  | EARN_MODULE_REDIRECT_TARGETS.STRATEGY_SELECTION_BOTTOM_SHEET
>;

const EARN_EXPERIENCE_DESTINATIONS: Record<
  EarnExperience['type'],
  EarnExperienceDepositDestination
> = {
  MONEY_ACCOUNT_DEPOSIT: EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT,
  [EARN_EXPERIENCES.POOLED_STAKING]:
    EARN_MODULE_REDIRECT_TARGETS.POOLED_STAKING_DEPOSIT,
  [EARN_EXPERIENCES.STABLECOIN_LENDING]:
    EARN_MODULE_REDIRECT_TARGETS.STABLECOIN_LENDING_DEPOSIT,
  [EARN_EXPERIENCES.TRX_STAKING]:
    EARN_MODULE_REDIRECT_TARGETS.TRX_STAKING_DEPOSIT,
};

const getEarnExperienceDestination = (
  experienceType: EarnExperience['type'],
): EarnExperienceDepositDestination => {
  const destination = EARN_EXPERIENCE_DESTINATIONS[experienceType];

  if (!destination) {
    throw new Error(
      `${LOG_PREFIX} Unsupported Earn experience: ${experienceType}`,
    );
  }

  return destination;
};

export const getEarnOpportunityDestination = (
  earnAsset: EarnAsset,
): EarnOpportunityDestination => {
  const inputExperiences = getEarnInputExperiences(earnAsset.experiences);
  const availableDepositExperiences = getAvailableEarnDepositExperiences(
    earnAsset.experiences,
  );

  if (inputExperiences.length === 0) {
    throw new Error(`${LOG_PREFIX} Earn asset has no eligible experiences`);
  }

  if (
    availableDepositExperiences.length !== inputExperiences.length ||
    inputExperiences.length > 1
  ) {
    return EARN_MODULE_REDIRECT_TARGETS.STRATEGY_SELECTION_BOTTOM_SHEET;
  }

  const singleSupportedExperience = inputExperiences[0];

  return getEarnExperienceDestination(singleSupportedExperience.type);
};

export const getEarnOpportunityRedirectTarget = (
  earnAsset: EarnAsset,
  isMoneyOnboardingRedirectNeeded: boolean,
): EarnOpportunityRedirectTarget | undefined => {
  try {
    const destination = getEarnOpportunityDestination(earnAsset);

    return destination === EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT &&
      isMoneyOnboardingRedirectNeeded
      ? EARN_MODULE_REDIRECT_TARGETS.MONEY_ONBOARDING
      : destination;
  } catch (error) {
    Logger.error(
      error as Error,
      `${LOG_PREFIX} Failed to resolve Earn opportunity redirect target`,
    );
    return undefined;
  }
};

export const getEarnExperienceRedirectTarget = (
  experience: EarnExperience,
  isMoneyOnboardingRedirectNeeded: boolean,
):
  | EARN_MODULE_REDIRECT_TARGETS.MONEY_ONBOARDING
  | EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT
  | EARN_MODULE_REDIRECT_TARGETS.POOLED_STAKING_DEPOSIT
  | EARN_MODULE_REDIRECT_TARGETS.STABLECOIN_LENDING_DEPOSIT
  | EARN_MODULE_REDIRECT_TARGETS.TRX_STAKING_DEPOSIT
  | undefined => {
  try {
    const destination = getEarnExperienceDestination(experience.type);

    return destination === EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT &&
      isMoneyOnboardingRedirectNeeded
      ? EARN_MODULE_REDIRECT_TARGETS.MONEY_ONBOARDING
      : destination;
  } catch (error) {
    Logger.error(
      error as Error,
      `${LOG_PREFIX} Failed to resolve Earn experience redirect target`,
    );
    return undefined;
  }
};

export const getSelectedEarnStrategyRedirectTarget = (
  experience: EarnExperience,
  isMoneyOnboardingRedirectNeeded: boolean,
  depositNavigationRoute: EarnDepositNavigationRoute | undefined,
): EarnOpportunityRedirectTarget | undefined =>
  depositNavigationRoute?.redirectTarget ??
  (experience.availability.status === 'unavailable'
    ? EARN_MODULE_REDIRECT_TARGETS.TOKEN_DETAILS
    : getEarnExperienceRedirectTarget(
        experience,
        isMoneyOnboardingRedirectNeeded,
      ));

/**
 * Navigates an Earn opportunity to strategy selection or Token Details based
 * on whether its experiences can currently accept a deposit.
 *
 * @param tokenDetailsSource - Attribution source for Token Details navigation.
 * @returns Earn opportunity navigation callback.
 */
const useEarnOpportunityNavigation = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { showToast, EarnToastOptions } = useEarnToasts();
  const { isStakingSupportedChain } = useStakingChain();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const {
    resolveEarnAssetAcquisitionRoute,
    navigateToEarnAssetAcquisitionRoute,
  } = useEarnAssetAcquisitionNavigation();

  const resolveEarnDepositNavigationRoute = useCallback(
    (
      earnAsset: EarnAsset,
      experience: EarnExperience,
    ): EarnDepositNavigationRoute | undefined => {
      if (
        experience.availability.status === 'unavailable' &&
        (experience.availability.reason === 'insufficient_balance' ||
          experience.availability.reason === 'asset_not_tracked') &&
        experience.type === 'MONEY_ACCOUNT_DEPOSIT'
      ) {
        return {
          type: 'money-fiat',
          redirectTarget: EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT,
        };
      }

      return resolveEarnAssetAcquisitionRoute(earnAsset, experience);
    },
    [resolveEarnAssetAcquisitionRoute],
  );

  const navigateToAssetOverview = useCallback(
    (earnAsset: EarnAsset, tokenDetailsSource?: TokenDetailsSource) => {
      const token = earnAssetToToken(earnAsset);
      navigation.navigate('Asset', {
        ...token,
        source: tokenDetailsSource,
      });
    },
    [navigation],
  );

  /**
   * Navigation to legacy EarnInputView screen.
   * Used for pooled-staking and stablecoin lending experiences.
   */
  const navigateToLegacyEarnDeposit = useCallback(
    (earnAsset: EarnAsset) => {
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
    async (earnAsset: EarnAsset) => {
      const asset = requireTrackedEarnAsset(
        earnAsset,
        'Stablecoin lending redirect',
      );

      if (!asset.chainId) {
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
    async (earnAsset: EarnAsset) => {
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
    async (earnAsset: EarnAsset) => {
      const preferredPaymentToken = getMoneyDepositPaymentToken(earnAsset);

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
      showToast,
    ],
  );

  const navigateToDepositForExperience = useCallback(
    async (
      earnAsset: EarnAsset,
      experience: EarnExperience,
      tokenDetailsSource?: TokenDetailsSource,
      depositNavigationRoute?: EarnDepositNavigationRoute,
    ) => {
      if (experience.availability.status === 'unavailable') {
        const resolvedDepositNavigationRoute =
          depositNavigationRoute ??
          resolveEarnDepositNavigationRoute(earnAsset, experience);

        if (resolvedDepositNavigationRoute) {
          if (resolvedDepositNavigationRoute.type === 'money-fiat') {
            try {
              await initiateDeposit({
                autoSelectFiatPayment: true,
                intent: 'card',
                onDepositSetupFailure: () =>
                  showToast(
                    EarnToastOptions.earnStrategySelection.navigationToDeposit,
                  ),
              });
            } catch (error) {
              if (
                !isUserRejectedError(
                  error,
                  `${LOG_PREFIX} Money deposit cancelled`,
                )
              ) {
                throw error;
              }
            }
            return;
          }

          await navigateToEarnAssetAcquisitionRoute(
            resolvedDepositNavigationRoute,
          );
          return;
        }

        navigateToAssetOverview(earnAsset, tokenDetailsSource);
        return;
      }

      if (earnAsset.wallet.status !== 'tracked') {
        throw new Error(
          `${LOG_PREFIX} Deposit redirect requires wallet-tracked asset: ${earnAsset.assetId}`,
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
      navigateToAssetOverview,
      initiateDeposit,
      navigateToEarnAssetAcquisitionRoute,
      resolveEarnDepositNavigationRoute,
      showToast,
      EarnToastOptions.earnStrategySelection.navigationToDeposit,
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

      const inputExperiences = getEarnInputExperiences(asset.experiences);
      let destination: EarnOpportunityDestination;
      try {
        destination = getEarnOpportunityDestination(asset);
      } catch (error) {
        showToast(EarnToastOptions.earnStrategySelection.navigationToDeposit);
        Logger.error(
          error as Error,
          `${LOG_PREFIX} Failed to resolve Earn opportunity destination`,
        );
        return;
      }

      if (destination === EARN_MODULE_REDIRECT_TARGETS.TOKEN_DETAILS) {
        navigateToAssetOverview(asset, tokenDetailsSource);
        return;
      }

      if (
        destination === EARN_MODULE_REDIRECT_TARGETS.POOLED_STAKING_DEPOSIT ||
        destination ===
          EARN_MODULE_REDIRECT_TARGETS.STABLECOIN_LENDING_DEPOSIT ||
        destination === EARN_MODULE_REDIRECT_TARGETS.TRX_STAKING_DEPOSIT ||
        destination === EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT
      ) {
        navigateToDepositForExperience(asset, inputExperiences[0]).catch(
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
          tokenDetailsSource,
          ...(analyticsContext ? { analyticsContext } : {}),
        },
      });
    },
    [
      navigation,
      navigateToAssetOverview,
      navigateToDepositForExperience,
      showToast,
      EarnToastOptions.earnStrategySelection.navigationToDeposit,
    ],
  );

  return {
    navigateFromEarnAsset,
    navigateToDepositForExperience,
    resolveEarnDepositNavigationRoute,
  };
};

export default useEarnOpportunityNavigation;
