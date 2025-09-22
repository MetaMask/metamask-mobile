import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
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
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
import { useTheme } from '../../../util/theme';
import { OnboardingSuccessSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingSuccess.selectors';

import importAdditionalAccounts from '../../../util/importAdditionalAccounts';
import createStyles from './index.styles';
import Rive, { Fit, Alignment, RiveRef } from 'rive-react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports, import/no-commonjs, @typescript-eslint/no-var-requires
const OnboardingLoaderAnimation = require('../../../animations/onboarding_loader.riv');
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import Logger from '../../../util/Logger';

import Engine from '../../../core/Engine/Engine';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { PopularList } from '../../../util/networks/customNetworks';
import { selectSeedlessOnboardingAuthConnection } from '../../../selectors/seedlessOnboardingController';
import { useDispatch, useSelector } from 'react-redux';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
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
  successFlow: _successFlow,
}) => {
  const navigation = useNavigation();

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const authConnection = useSelector(selectSeedlessOnboardingAuthConnection);

  const isSocialLogin =
    authConnection === AuthConnection.Google ||
    authConnection === AuthConnection.Apple;

  // Rive animation refs and state
  const riveRef = useRef<RiveRef>(null);
  const [animationStep, setAnimationStep] = useState(1);

  useLayoutEffect(() => {
    navigation.setOptions(
      getTransparentOnboardingNavbarOptions(colors, undefined, false),
    );
  }, [navigation, colors]);

  const goToDefaultSettings = () => {
    navigation.navigate(Routes.ONBOARDING.SUCCESS_FLOW, {
      screen: Routes.ONBOARDING.DEFAULT_SETTINGS,
    });
  };

  // Auto-navigation for social login users
  const handleAutoNavigate = useCallback(() => {
    onDone();
  }, [onDone]);

  // Start Rive animation with dark mode support
  const startRiveAnimation = useCallback(() => {
    try {
      if (riveRef.current) {
        // Set dark mode state
        // Commenting out as per user request
        // const isDarkMode = themeAppearance === 'dark';
        // riveRef.current.setInputState('OnboardingLoader', 'Dark', isDarkMode);

        // Start animation
        riveRef.current.fireState('OnboardingLoader', 'Start');

        // Animation sequence timing
        setTimeout(() => setAnimationStep(2), 1000); // Step 2: Animation playing
        setTimeout(() => {
          setAnimationStep(3); // Step 3: Complete

          // Auto-navigate for social login users
          if (isSocialLogin) {
            setTimeout(() => handleAutoNavigate(), 1000);
          }
        }, 3000);
      }
    } catch (error) {
      Logger.error(
        error as Error,
        'Error triggering Rive onboarding animation',
      );
    }
  }, [handleAutoNavigate, isSocialLogin]);

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

  useEffect(() => {
    // Start Rive animation after component mounts
    const timer = setTimeout(() => {
      startRiveAnimation();
    }, 500);

    return () => clearTimeout(timer);
  }, [startRiveAnimation]);

  const renderContent = () => (
      <View style={styles.animationContainer}>
        {/* Rive Animation */}
        <Rive
          ref={riveRef}
          source={OnboardingLoaderAnimation}
          fit={Fit.Cover}
          alignment={Alignment.Center}
          style={styles.riveAnimation}
        />

        {/* Text Overlay */}
        <View style={styles.textOverlay}>
          <Text
            variant={TextVariant.DisplayMD}
            style={styles.textTitle}
            color={TextColor.Default}
          >
            {animationStep === 3
              ? strings('onboarding_success.wallet_ready')
              : strings('onboarding_success.setting_up_wallet')}
          </Text>
        </View>
      </View>
    );

  const renderFooter = () => {
    // Only show for SRP users, not social login users
    if (isSocialLogin) return null;

    return (
      <View style={styles.footerWrapper}>
        <TouchableOpacity
          style={styles.footerLink}
          onPress={goToDefaultSettings}
          testID={OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON}
        >
          <Text color={TextColor.Primary} variant={TextVariant.BodyMD}>
            {strings('onboarding_success.manage_default_settings')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.root]}
      testID={OnboardingSuccessSelectorIDs.CONTAINER_ID}
    >
      <View style={styles.contentContainer}>
        <View style={styles.contentWrapper}>
          {renderContent()}
          {renderFooter()}
        </View>
        {/* Only show Done button for SRP users */}
        {!isSocialLogin && (
          <View style={styles.buttonWrapper}>
            <Button
              testID={OnboardingSuccessSelectorIDs.DONE_BUTTON}
              label={strings('onboarding_success.done')}
              variant={ButtonVariants.Primary}
              onPress={handleOnDone}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
            />
          </View>
        )}
      </View>
    </ScrollView>
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
    async function addNetworks() {
      // List of chainIds to add (as hex strings)
      const chainIdsToAdd: `0x${string}`[] = [
        CHAIN_IDS.ARBITRUM,
        CHAIN_IDS.BSC,
        CHAIN_IDS.OPTIMISM,
        CHAIN_IDS.POLYGON,
      ];

      // Filter the PopularList to get only the specified networks based on chainId
      const selectedNetworks = PopularList.filter((network) =>
        chainIdsToAdd.includes(network.chainId),
      );
      const {
        NetworkController,
        TokenDetectionController,
        TokenBalancesController,
        TokenListController,
        AccountTrackerController,
        TokenRatesController,
        CurrencyRateController,
      } = Engine.context;

      const addedChainIds: `0x${string}`[] = [];
      const networkClientIds: string[] = [];

      // First, add all networks sequentially
      for (const network of selectedNetworks) {
        try {
          await NetworkController.addNetwork({
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
          addedChainIds.push(network.chainId);
          // Get network client ID for later batch refresh
          const networkClientId =
            await NetworkController.findNetworkClientIdByChainId(
              network.chainId,
            );
          if (networkClientId) {
            networkClientIds.push(networkClientId);
          }
          dispatch(onboardNetworkAction(network.chainId));
        } catch (error) {
          Logger.error(
            error as Error,
            `Failed to add network ${network.nickname}`,
          );
        }
      }

      // Then perform batch operations on all successfully added networks
      if (addedChainIds.length > 0) {
        try {
          // Batch fetch token lists for all chains
          await Promise.all(
            addedChainIds.map((chainId) =>
              TokenListController.fetchTokenList(chainId).catch((error) =>
                Logger.error(
                  error as Error,
                  `Failed to fetch token list for ${chainId}`,
                ),
              ),
            ),
          );

          // Batch detect tokens for all chains
          await TokenDetectionController.detectTokens({
            chainIds: addedChainIds,
          });

          // Batch update balances for all chains
          await Promise.all(
            addedChainIds.map((chainId) =>
              TokenBalancesController.updateBalances({
                chainIds: [chainId],
              }).catch((error) =>
                Logger.error(
                  error as Error,
                  `Failed to update balances for ${chainId}`,
                ),
              ),
            ),
          );

          // Batch update currency rates
          await CurrencyRateController.updateExchangeRate(
            addedChainIds.map(
              (chainId) =>
                selectedNetworks.find((network) => network.chainId === chainId)
                  ?.ticker || 'ETH',
            ),
          );

          // Batch update rates for all chains
          await Promise.all(
            addedChainIds.map((chainId) =>
              TokenRatesController.updateExchangeRatesByChainId([
                {
                  chainId,
                  nativeCurrency:
                    selectedNetworks.find(
                      (network) => network.chainId === chainId,
                    )?.ticker || 'ETH',
                },
              ]).catch((error) =>
                Logger.error(
                  error as Error,
                  `Failed to update rates for ${chainId}`,
                ),
              ),
            ),
          );

          // Batch refresh account tracker for all network clients
          if (networkClientIds.length > 0) {
            await AccountTrackerController.refresh(networkClientIds);
          }
        } catch (error) {
          Logger.error(error as Error, 'Failed during batch operations');
        }
      }
    }

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
