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

const LOG_PREFIX = '[useEarnOpportunityNavigation]';

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
        console.error(
          `Stablecoin lending redirect failed: could not retrieve networkClientId for chainId: ${asset.chainId}`,
        );
        return;
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
        });
      } catch (error) {
        Logger.error(
          error as Error,
          `${LOG_PREFIX} Failed to initiate Money deposit`,
        );
      }
    },
    [initiateDeposit, redirectToOnboardingIfNeeded],
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
    (asset: EarnAsset, tokenDetailsSource?: TokenDetailsSource) => {
      if (!asset) {
        return;
      }

      if (isEarnAssetBalanceBelowMinDepositAmount(asset)) {
        const token = earnAssetToToken(asset);
        navigation.navigate('Asset', {
          ...token,
          source: tokenDetailsSource,
        });
        return;
      }

      const hasSingleStrategy = asset.experiences.length === 1;

      if (hasSingleStrategy) {
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
        params: { earnAsset: asset },
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
