import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import {
  ScrollView,
  View,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { RpcEndpointType } from '@metamask/network-controller';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
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
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import Logger from '../../../util/Logger';
import walletReadyImage from '../../../images/wallet_success.png';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

import Engine from '../../../core/Engine/Engine';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { PopularList } from '../../../util/networks/customNetworks';
import { useDispatch } from 'react-redux';
import { onboardNetworkAction } from '../../../actions/onboardNetwork';
import { isMultichainAccountsState2Enabled } from '../../../multichain-accounts/remote-feature-flag';
import { discoverAccounts } from '../../../multichain-accounts/discovery';
import { isE2E } from '../../../util/test/utils';

export const ResetNavigationToHome = CommonActions.reset({
  index: 0,
  routes: [{ name: 'HomeNav' }],
});

interface OnboardingSuccessProps {
  onDone: () => void;
  _successFlow: ONBOARDING_SUCCESS_FLOW;
}

export const OnboardingSuccessComponent: React.FC<OnboardingSuccessProps> = ({
  onDone,
  _successFlow: _,
}) => {
  const navigation = useNavigation();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const { colors, themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';
  const styles = useMemo(
    () => createStyles(colors, isDarkMode),
    [colors, isDarkMode],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (isE2E) {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

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

  const renderContent = useCallback(
    () => (
      <View style={styles.contentWrapper}>
        <View style={styles.imageWrapper}>
          <Image
            source={walletReadyImage}
            style={styles.walletReadyImage}
            resizeMode="contain"
            testID="wallet-ready-image"
          />
        </View>
        <Text variant={TextVariant.HeadingLG} style={styles.textTitle}>
          {strings('onboarding_success.wallet_ready')}
        </Text>
      </View>
    ),
    [
      styles.contentWrapper,
      styles.imageWrapper,
      styles.walletReadyImage,
      styles.textTitle,
    ],
  );

  const renderButtons = useCallback(
    () => (
      <View style={styles.buttonContainer}>
        <Button
          testID={OnboardingSuccessSelectorIDs.DONE_BUTTON}
          label={strings('onboarding_success.done')}
          variant={ButtonVariants.Primary}
          onPress={handleOnDone}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
        />
      </View>
    ),
    [styles.buttonContainer, handleOnDone],
  );

  const renderFooter = () => (
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

  return (
    <ScrollView
      contentContainerStyle={[styles.root]}
      testID={OnboardingSuccessSelectorIDs.CONTAINER_ID}
    >
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.contentWrapper}>{renderContent()}</View>
        {renderButtons()}
        {renderFooter()}
      </Animated.View>
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
      _successFlow={successFlow}
      onDone={() => navigation.dispatch(nextScreen)}
    />
  );
};

export default OnboardingSuccess;
