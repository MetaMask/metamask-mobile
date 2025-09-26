import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, View, TouchableOpacity, Animated } from 'react-native';
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
import OnboardingLoaderAnimation from '../../../animations/onboarding_loader.riv';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import Logger from '../../../util/Logger';
import { isE2E } from '../../../util/test/utils';

import Engine from '../../../core/Engine/Engine';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { PopularList } from '../../../util/networks/customNetworks';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';
import { useDispatch, useSelector } from 'react-redux';
import { onboardNetworkAction } from '../../../actions/onboardNetwork';
import { isMultichainAccountsState2Enabled } from '../../../multichain-accounts/remote-feature-flag';
import { discoverAccounts } from '../../../multichain-accounts/discovery';

const clearTimers = (timerRefs: {
  animationId?: React.MutableRefObject<NodeJS.Timeout | null>;
  dotsIntervalId?: React.MutableRefObject<NodeJS.Timeout | null>;
  finalTimeoutId?: React.MutableRefObject<NodeJS.Timeout | null>;
  socialLoginTimeoutId?: React.MutableRefObject<NodeJS.Timeout | null>;
}) => {
  if (timerRefs.animationId?.current) {
    clearTimeout(timerRefs.animationId.current);
    timerRefs.animationId.current = null;
  }
  if (timerRefs.dotsIntervalId?.current) {
    clearInterval(timerRefs.dotsIntervalId.current);
    timerRefs.dotsIntervalId.current = null;
  }
  if (timerRefs.finalTimeoutId?.current) {
    clearTimeout(timerRefs.finalTimeoutId.current);
    timerRefs.finalTimeoutId.current = null;
  }
  if (timerRefs.socialLoginTimeoutId?.current) {
    clearTimeout(timerRefs.socialLoginTimeoutId.current);
    timerRefs.socialLoginTimeoutId.current = null;
  }
};

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

  const { colors, themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';
  const styles = createStyles(colors, isDarkMode);

  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);

  const riveRef = useRef<RiveRef>(null);
  const [animationStep, setAnimationStep] = useState(1);
  const [dotsCount, setDotsCount] = useState(1);
  const hasAnimationStarted = useRef(false);
  const animationId = useRef<NodeJS.Timeout | null>(null);
  const dotsIntervalId = useRef<NodeJS.Timeout | null>(null);
  const finalTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const socialLoginTimeoutId = useRef<NodeJS.Timeout | null>(null);

  const fadeOutOpacity = useRef(new Animated.Value(1)).current;
  const fadeInOpacity = useRef(new Animated.Value(0)).current;

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

  const startFadeTransition = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeOutOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fadeInOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeOutOpacity, fadeInOpacity]);

  const startRiveAnimation = useCallback(() => {
    if (isE2E) {
      setAnimationStep(3);
      if (isSocialLogin && onDone) {
        setTimeout(() => onDone(), 100);
      }
      return;
    }

    try {
      if (
        hasAnimationStarted.current ||
        !riveRef.current ||
        animationId.current
      ) {
        return;
      }

      hasAnimationStarted.current = true;

      const isDarkMode = themeAppearance === 'dark';
      riveRef.current.setInputState(
        'OnboardingLoader',
        'Dark mode',
        isDarkMode,
      );

      riveRef.current.fireState('OnboardingLoader', 'Start');

      dotsIntervalId.current = setInterval(() => {
        setDotsCount((prev) => (prev >= 3 ? 1 : prev + 1));
      }, 500);

      animationId.current = setTimeout(() => {
        clearTimers({ dotsIntervalId });
        setAnimationStep(2);
      }, 2000);

      finalTimeoutId.current = setTimeout(() => {
        setAnimationStep(3);
        setTimeout(() => {
          if (riveRef.current) {
            riveRef.current.fireState('OnboardingLoader', 'End');
            startFadeTransition();
          }
        }, 50);

        finalTimeoutId.current = null;

        const currentIsSocialLogin = isSocialLogin;
        if (currentIsSocialLogin) {
          socialLoginTimeoutId.current = setTimeout(() => onDone(), 1000);
        }
      }, 3500);
    } catch (error) {
      Logger.error(
        error as Error,
        'Error triggering Rive onboarding animation',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startFadeTransition, isSocialLogin, onDone]);

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
      clearTimers({
        animationId,
        dotsIntervalId,
        finalTimeoutId,
        socialLoginTimeoutId,
      });
    };
  }, [startRiveAnimation]);

  const renderAnimatedDots = () => {
    const count = Math.max(1, Math.min(3, dotsCount));
    const dots = '.'.repeat(count);
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
    if (
      isSocialLogin ||
      !successFlow ||
      successFlow === ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE ||
      successFlow === ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP ||
      successFlow === ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP ||
      successFlow === ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP ||
      successFlow === ONBOARDING_SUCCESS_FLOW.REMINDER_BACKUP
    ) {
      return (
        <View style={styles.animationContainer}>
          {RiveAnimationComponent}
          <View style={styles.textOverlay}>
            {animationStep === 3 ? (
              <>
                {/* Fade out: Setup text */}
                <Animated.View
                  style={[styles.fadeOutContainer, { opacity: fadeOutOpacity }]}
                >
                  <Text
                    variant={TextVariant.HeadingLG}
                    style={styles.textTitle}
                    color={TextColor.Default}
                  >
                    {strings('onboarding_success.setting_up_wallet')}
                  </Text>
                </Animated.View>
                {/* Fade in: Ready text */}
                <Animated.View
                  style={[styles.fadeInContainer, { opacity: fadeInOpacity }]}
                >
                  <Text
                    variant={TextVariant.DisplayMD}
                    style={styles.textTitle}
                    color={TextColor.Default}
                  >
                    {strings('onboarding_success.wallet_ready')}
                  </Text>
                </Animated.View>
              </>
            ) : (
              <Text
                variant={TextVariant.HeadingLG}
                style={styles.textTitle}
                color={TextColor.Default}
              >
                {animationStep === 1
                  ? `${strings(
                      'onboarding_success.setting_up_wallet_base',
                    )}${renderAnimatedDots()}`
                  : strings('onboarding_success.setting_up_wallet')}
              </Text>
            )}
          </View>
        </View>
      );
    }

    switch (successFlow) {
      default:
        return (
          <View style={styles.animationContainer}>
            {RiveAnimationComponent}
            <View style={styles.textOverlay}>
              {animationStep === 3 ? (
                <>
                  <Animated.View
                    style={[
                      styles.fadeOutContainer,
                      { opacity: fadeOutOpacity },
                    ]}
                  >
                    <Text
                      variant={TextVariant.HeadingLG}
                      style={styles.textTitle}
                      color={TextColor.Default}
                    >
                      {strings('onboarding_success.setting_up_wallet')}
                    </Text>
                  </Animated.View>
                  <Animated.View
                    style={[styles.fadeInContainer, { opacity: fadeInOpacity }]}
                  >
                    <Text
                      variant={TextVariant.DisplayMD}
                      style={styles.textTitle}
                      color={TextColor.Default}
                    >
                      {strings('onboarding_success.wallet_ready')}
                    </Text>
                  </Animated.View>
                </>
              ) : (
                <Text
                  variant={TextVariant.HeadingLG}
                  style={styles.textTitle}
                  color={TextColor.Default}
                >
                  {animationStep === 1
                    ? `${strings(
                        'onboarding_success.setting_up_wallet_base',
                      )}${renderAnimatedDots()}`
                    : strings('onboarding_success.setting_up_wallet')}
                </Text>
              )}
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
