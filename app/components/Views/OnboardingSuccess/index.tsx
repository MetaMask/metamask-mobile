import React, { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { ScrollView, View, Linking, TouchableOpacity } from 'react-native';
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
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import AppConstants from '../../../core/AppConstants';
import { OnboardingSuccessSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingSuccess.selectors';

import importAdditionalAccounts from '../../../util/importAdditionalAccounts';
import createStyles from './index.styles';
import CelebratingFox from '../../../animations/Celebrating_Fox.json';
import SearchingFox from '../../../animations/Searching_Fox.json';
import LottieView, { AnimationObject } from 'lottie-react-native';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import Logger from '../../../util/Logger';

import Engine from '../../../core/Engine/Engine';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { PopularList } from '../../../util/networks/customNetworks';
import { selectSeedlessOnboardingAuthConnection } from '../../../selectors/seedlessOnboardingController';
import { useDispatch, useSelector } from 'react-redux';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import { capitalize } from 'lodash';
import { onboardNetworkAction } from '../../../actions/onboardNetwork';

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

  const authConnection = useSelector(selectSeedlessOnboardingAuthConnection);

  const isSocialLogin =
    authConnection === AuthConnection.Google ||
    authConnection === AuthConnection.Apple;

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

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.WHAT_IS_SRP);
  };

  const handleOnDone = useCallback(() => {
    const onOnboardingSuccess = async () => {
      await importAdditionalAccounts();
    };
    onOnboardingSuccess();
    onDone();
  }, [onDone]);

  const renderContent = () => {
    switch (successFlow) {
      case ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP:
      case ONBOARDING_SUCCESS_FLOW.REMINDER_BACKUP:
        return (
          <>
            <Text variant={TextVariant.DisplayMD} style={styles.textTitle}>
              {strings('onboarding_success.title')}
            </Text>
            <View style={styles.imageWrapper}>
              <LottieView
                style={styles.walletReadyImage}
                autoPlay
                loop
                source={SearchingFox as AnimationObject}
                resizeMode="contain"
              />
            </View>
            <View style={styles.descriptionWrapper}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('onboarding_success.description')}
                {'\n'}
                {'\n'}
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    color={TextColor.Info}
                    onPress={handleLink}
                  >
                    {strings('onboarding_success.learn_how')}
                  </Text>
                  {' ' + strings('onboarding_success.description_continued')}
                </Text>
              </Text>
            </View>
          </>
        );
      case ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP:
        return (
          <>
            <Text variant={TextVariant.DisplayMD} style={styles.textTitle}>
              {strings('onboarding_success.remind_later')}
            </Text>
            <View style={styles.imageWrapper}>
              <LottieView
                style={styles.walletReadyImage}
                autoPlay
                loop
                source={SearchingFox as AnimationObject}
                resizeMode="contain"
              />
            </View>
            <View style={styles.descriptionWrapper}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('onboarding_success.remind_later_description')}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('onboarding_success.remind_later_description2')}
                <Text variant={TextVariant.BodyMDMedium}>
                  {' ' + strings('onboarding_success.setting_security_privacy')}
                </Text>
              </Text>
            </View>
          </>
        );
      default:
        return (
          <>
            <Text variant={TextVariant.DisplayMD} style={styles.textTitle}>
              {strings('onboarding_success.import_title')}
            </Text>
            <View style={styles.imageWrapper}>
              <LottieView
                style={styles.walletReadyImage}
                autoPlay
                loop
                source={CelebratingFox as AnimationObject}
                resizeMode="contain"
              />
            </View>
            <View style={styles.descriptionWrapper}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {isSocialLogin
                  ? strings(
                      'onboarding_success.import_description_social_login',
                      {
                        authConnection: capitalize(authConnection) || '',
                      },
                    )
                  : strings('onboarding_success.import_description')}
              </Text>
              {isSocialLogin ? (
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings(
                    'onboarding_success.import_description_social_login_2',
                  )}
                </Text>
              ) : (
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  <Text
                    color={TextColor.Primary}
                    onPress={handleLink}
                    testID={OnboardingSuccessSelectorIDs.LEARN_MORE_LINK_ID}
                  >
                    {strings('onboarding_success.learn_how')}{' '}
                  </Text>
                  {strings('onboarding_success.import_description2')}
                </Text>
              )}
            </View>
          </>
        );
    }
  };

  const renderFooter = () => (
    <View style={styles.footerWrapper}>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.linkWrapper]}
          onPress={goToDefaultSettings}
          testID={OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON}
        >
          <View style={styles.row}>
            <Icon
              name={IconName.Setting}
              size={IconSize.Lg}
              color={IconColor.Default}
            />
            <Text color={TextColor.Default} variant={TextVariant.BodyMDMedium}>
              {strings('onboarding_success.manage_default_settings')}
            </Text>
          </View>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Lg}
            color={IconColor.Alternative}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

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
