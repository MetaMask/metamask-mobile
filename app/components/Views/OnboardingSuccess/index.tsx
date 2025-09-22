import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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
  successFlow,
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
  const [dotsCount, setDotsCount] = useState(1);
  const hasAnimationStarted = useRef(false);
  const animationId = useRef<NodeJS.Timeout | null>(null);
  const dotsIntervalId = useRef<NodeJS.Timeout | null>(null);
  const finalTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const socialLoginTimeoutId = useRef<NodeJS.Timeout | null>(null);

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

  const startRiveAnimation = useCallback(() => {
    try {
      if (
        hasAnimationStarted.current ||
        !riveRef.current ||
        animationId.current
      ) {
        return;
      }

      hasAnimationStarted.current = true;

      // Set dark mode state
      // Commenting out as per user request
      // const isDarkMode = themeAppearance === 'dark';
      // riveRef.current.setInputState('OnboardingLoader', 'Dark', isDarkMode);

      riveRef.current.fireState('OnboardingLoader', 'Start');

      dotsIntervalId.current = setInterval(() => {
        setDotsCount((prev) => (prev >= 3 ? 1 : prev + 1));
      }, 300);

      animationId.current = setTimeout(() => {
        if (dotsIntervalId.current) {
          clearInterval(dotsIntervalId.current);
          dotsIntervalId.current = null;
        }
        setAnimationStep(2);
      }, 1200);

      finalTimeoutId.current = setTimeout(() => {
        setAnimationStep(3);
        finalTimeoutId.current = null;

        const currentIsSocialLogin =
          authConnection === AuthConnection.Google ||
          authConnection === AuthConnection.Apple;
        if (currentIsSocialLogin) {
          socialLoginTimeoutId.current = setTimeout(() => onDone(), 1000);
        }
      }, 3000);
    } catch (error) {
      Logger.error(
        error as Error,
        'Error triggering Rive onboarding animation',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    startRiveAnimation();

    return () => {
      // Clear all timers
      if (animationId.current) {
        clearTimeout(animationId.current);
        animationId.current = null;
      }
      if (dotsIntervalId.current) {
        clearInterval(dotsIntervalId.current);
        dotsIntervalId.current = null;
      }
      if (finalTimeoutId.current) {
        clearTimeout(finalTimeoutId.current);
        finalTimeoutId.current = null;
      }
      if (socialLoginTimeoutId.current) {
        clearTimeout(socialLoginTimeoutId.current);
        socialLoginTimeoutId.current = null;
      }
    };
  }, [startRiveAnimation]);

  const renderAnimatedDots = () => {
    const dots = '.'.repeat(dotsCount);
    return dots;
  };

  const RiveAnimationComponent = useMemo(
    () => (
      <Rive
        ref={riveRef}
        source={OnboardingLoaderAnimation}
        fit={Fit.Cover}
        alignment={Alignment.Center}
        style={styles.riveAnimation}
      />
    ),
    [styles.riveAnimation],
  );

  const renderContent = () => {
    // For social login flows and new onboarding, show dynamic text
    if (
      isSocialLogin ||
      !successFlow ||
      successFlow === ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE
    ) {
      return (
        <View style={styles.animationContainer}>
          {RiveAnimationComponent}
          <View style={styles.textOverlay}>
            <Text
              variant={TextVariant.DisplayMD}
              style={styles.textTitle}
              color={TextColor.Default}
            >
              {animationStep === 3
                ? strings('onboarding_success.wallet_ready')
                : animationStep === 1
                ? `Setting up your wallet${renderAnimatedDots()}`
                : 'Setting up your wallet...'}
            </Text>
          </View>
        </View>
      );
    }

    // For backup flows, show Rive animation with static content based on flow
    switch (successFlow) {
      case ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP:
        return (
          <View style={styles.animationContainer}>
            {RiveAnimationComponent}
            <View style={styles.textOverlay}>
              <Text
                variant={TextVariant.DisplayMD}
                style={styles.textTitle}
                color={TextColor.Default}
              >
                {strings('onboarding_success.title')}
              </Text>
              <Text style={styles.subtitle}>
                {strings('onboarding_success.subtitle')}
              </Text>
            </View>
          </View>
        );

      case ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP:
        return (
          <View style={styles.animationContainer}>
            {RiveAnimationComponent}
            <View style={styles.textOverlay}>
              <Text
                variant={TextVariant.DisplayMD}
                style={styles.textTitle}
                color={TextColor.Default}
              >
                {strings('onboarding_success.title_no_backup')}
              </Text>
              <Text style={styles.subtitle}>
                {strings('onboarding_success.subtitle_no_backup')}
              </Text>
            </View>
          </View>
        );

      case ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP:
      case ONBOARDING_SUCCESS_FLOW.REMINDER_BACKUP:
        return (
          <View style={styles.animationContainer}>
            {RiveAnimationComponent}
            <View style={styles.textOverlay}>
              <Text
                variant={TextVariant.DisplayMD}
                style={styles.textTitle}
                color={TextColor.Default}
              >
                {strings('onboarding_success.backup_complete')}
              </Text>
              <Text style={styles.subtitle}>
                {strings('onboarding_success.backup_subtitle')}
              </Text>
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.animationContainer}>
            {RiveAnimationComponent}
            <View style={styles.textOverlay}>
              <Text
                variant={TextVariant.DisplayMD}
                style={styles.textTitle}
                color={TextColor.Default}
              >
                {animationStep === 3
                  ? strings('onboarding_success.wallet_ready')
                  : animationStep === 1
                  ? `Setting up your wallet${renderAnimatedDots()}`
                  : 'Setting up your wallet...'}
              </Text>
            </View>
          </View>
        );
    }
  };

  const renderFooter = () => {
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
          {renderFooter()}
        </View>
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
