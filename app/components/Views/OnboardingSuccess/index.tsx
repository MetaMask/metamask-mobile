import React, { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RpcEndpointType } from '@metamask/network-controller';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Text from '../../../component-library/components/Texts/Text';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text/Text.types';
import {
  CommonActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { useTheme } from '../../../util/theme';
import { OnboardingSuccessSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingSuccess.selectors';

import importAdditionalAccounts from '../../../util/importAdditionalAccounts';
import createStyles from './index.styles';
import OnboardingSuccessEndAnimation from './OnboardingSuccessEndAnimation/index';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import Logger from '../../../util/Logger';

import Engine from '../../../core/Engine/Engine';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { PopularList } from '../../../util/networks/customNetworks';
import { useDispatch } from 'react-redux';
import { onboardNetworkAction } from '../../../actions/onboardNetwork';
import { isMultichainAccountsState2Enabled } from '../../../multichain-accounts/remote-feature-flag';
import { discoverAccounts } from '../../../multichain-accounts/discovery';

export const ResetNavigationToHome = CommonActions.reset({
  index: 0,
  routes: [{ name: 'HomeNav' }],
});

interface OnboardingSuccessProps {
  onDone: () => void;
  successFlow: ONBOARDING_SUCCESS_FLOW;
}

export const OnboardingSuccessComponent: React.FC<OnboardingSuccessProps> = ({
  onDone,
  successFlow,
}) => {
  const navigation = useNavigation();

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const goToDefaultSettings = () => {
    navigation.navigate(Routes.ONBOARDING.SUCCESS_FLOW, {
      screen: Routes.ONBOARDING.DEFAULT_SETTINGS,
    });
  };

  const handleOnDone = useCallback(() => {
    const onOnboardingSuccess = async () => {
      // We're not running EVM discovery on its own if state 2 is enabled. The discovery
      // will be run on every account providers (EVM included) prior to that point.
      if (isMultichainAccountsState2Enabled()) {
        await discoverAccounts(
          Engine.context.KeyringController.state.keyrings[0].metadata.id,
        );
      } else {
        await importAdditionalAccounts();
      }
    };
    onOnboardingSuccess();
    onDone();
  }, [onDone]);

  const getTitleString = () => {
    if (successFlow === ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP) {
      return strings('onboarding_success.title');
    }
    return strings('onboarding_success.wallet_ready');
  };

  const renderContent = () => (
    <>
      <OnboardingSuccessEndAnimation
        onAnimationComplete={() => {
          // No-op: Animation completion not needed in success mode
        }}
      />
      <Text variant={TextVariant.DisplayMD} style={styles.textTitle}>
        {getTitleString()}
      </Text>
    </>
  );

  const renderFooter = () => {
    // Hide default settings for settings backup flow
    if (successFlow === ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP) {
      return null;
    }

    return (
      <TouchableOpacity
        onPress={goToDefaultSettings}
        testID={OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON}
        style={styles.footerLink}
      >
        <Text color={TextColor.Info} variant={TextVariant.BodyMDMedium}>
          {strings('onboarding_success.manage_default_settings')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.root}>
      <View
        style={styles.container}
        testID={OnboardingSuccessSelectorIDs.CONTAINER_ID}
      >
        <View style={styles.animationSection}>{renderContent()}</View>

        <View style={styles.buttonSection}>
          <Button
            testID={OnboardingSuccessSelectorIDs.DONE_BUTTON}
            label={strings('onboarding_success.done')}
            variant={ButtonVariants.Primary}
            onPress={handleOnDone}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
          />
          {renderFooter()}
        </View>
      </View>
    </SafeAreaView>
  );
};

export const OnboardingSuccess = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { successFlow: ONBOARDING_SUCCESS_FLOW };
  const dispatch = useDispatch();

  const successFlow = params?.successFlow;

  const nextScreen = ResetNavigationToHome;

  useEffect(() => {
    const addSingleNetwork = async (
      network: (typeof PopularList)[number],
      controllers: typeof Engine.context,
    ): Promise<{
      chainId: `0x${string}`;
      networkClientId: string | null;
    } | null> => {
      try {
        await controllers.NetworkController.addNetwork({
          chainId: network.chainId,
          blockExplorerUrls: [network.rpcPrefs.blockExplorerUrl],
          defaultRpcEndpointIndex: 0,
          defaultBlockExplorerUrlIndex: 0,
          name: network.nickname,
          nativeCurrency: network.ticker,
          rpcEndpoints: [
            {
              url: network.rpcUrl,
              failoverUrls: network.failoverRpcUrls,
              name: network.nickname,
              type: RpcEndpointType.Custom,
            },
          ],
        });

        const networkClientId =
          await controllers.NetworkController.findNetworkClientIdByChainId(
            network.chainId,
          );

        dispatch(onboardNetworkAction(network.chainId));

        return {
          chainId: network.chainId,
          networkClientId: networkClientId || null,
        };
      } catch (error) {
        Logger.error(
          error as Error,
          `Failed to add network ${network.nickname}`,
        );
        return null;
      }
    };

    const fetchTokenListSafely = async (
      chainId: `0x${string}`,
      controller: typeof Engine.context.TokenListController,
    ): Promise<void> => {
      try {
        await controller.fetchTokenList(chainId);
      } catch (error) {
        Logger.error(
          error as Error,
          `Failed to fetch token list for ${chainId}`,
        );
      }
    };

    const updateBalancesSafely = async (
      chainId: `0x${string}`,
      controller: typeof Engine.context.TokenBalancesController,
    ): Promise<void> => {
      try {
        await controller.updateBalances({ chainIds: [chainId] });
      } catch (error) {
        Logger.error(
          error as Error,
          `Failed to update balances for ${chainId}`,
        );
      }
    };

    const updateRatesSafely = async (
      chainId: `0x${string}`,
      ticker: string,
      controller: typeof Engine.context.TokenRatesController,
    ): Promise<void> => {
      try {
        await controller.updateExchangeRatesByChainId([
          { chainId, nativeCurrency: ticker },
        ]);
      } catch (error) {
        Logger.error(error as Error, `Failed to update rates for ${chainId}`);
      }
    };

    const performBatchOperations = async (
      addedChainIds: `0x${string}`[],
      networkClientIds: string[],
      selectedNetworks: (typeof PopularList)[number][],
      controllers: typeof Engine.context,
    ): Promise<void> => {
      if (addedChainIds.length === 0) return;

      try {
        // Batch fetch token lists for all chains
        await Promise.all(
          addedChainIds.map((chainId) =>
            fetchTokenListSafely(chainId, controllers.TokenListController),
          ),
        );

        // Batch detect tokens for all chains
        await controllers.TokenDetectionController.detectTokens({
          chainIds: addedChainIds,
        });

        // Batch update balances for all chains
        await Promise.all(
          addedChainIds.map((chainId) =>
            updateBalancesSafely(chainId, controllers.TokenBalancesController),
          ),
        );

        // Batch update currency rates
        const tickers = addedChainIds.map(
          (chainId) =>
            selectedNetworks.find((network) => network.chainId === chainId)
              ?.ticker || 'ETH',
        );
        await controllers.CurrencyRateController.updateExchangeRate(tickers);

        // Batch update rates for all chains
        await Promise.all(
          addedChainIds.map((chainId) => {
            const ticker =
              selectedNetworks.find((network) => network.chainId === chainId)
                ?.ticker || 'ETH';
            return updateRatesSafely(
              chainId,
              ticker,
              controllers.TokenRatesController,
            );
          }),
        );

        // Batch refresh account tracker for all network clients
        if (networkClientIds.length > 0) {
          await controllers.AccountTrackerController.refresh(networkClientIds);
        }
      } catch (error) {
        Logger.error(error as Error, 'Failed during batch operations');
      }
    };

    const addNetworks = async (): Promise<void> => {
      const chainIdsToAdd: `0x${string}`[] = [
        CHAIN_IDS.ARBITRUM,
        CHAIN_IDS.BSC,
        CHAIN_IDS.OPTIMISM,
        CHAIN_IDS.POLYGON,
      ];

      const selectedNetworks = PopularList.filter((network) =>
        chainIdsToAdd.includes(network.chainId),
      );

      const controllers = Engine.context;
      const addedChainIds: `0x${string}`[] = [];
      const networkClientIds: string[] = [];

      // Add all networks sequentially
      for (const network of selectedNetworks) {
        const result = await addSingleNetwork(network, controllers);
        if (result) {
          addedChainIds.push(result.chainId);
          if (result.networkClientId) {
            networkClientIds.push(result.networkClientId);
          }
        }
      }

      // Perform batch operations on successfully added networks
      await performBatchOperations(
        addedChainIds,
        networkClientIds,
        selectedNetworks,
        controllers,
      );
    };

    addNetworks().catch((error) => {
      Logger.error(error, 'Error adding networks');
    });
  }, [dispatch]);

  return (
    <OnboardingSuccessComponent
      successFlow={successFlow}
      onDone={() => navigation.dispatch(nextScreen)}
    />
  );
};

export default OnboardingSuccess;
