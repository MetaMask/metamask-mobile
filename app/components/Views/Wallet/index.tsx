import React, {
  useEffect,
  useRef,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import {
  ActivityIndicator,
  StyleSheet as RNStyleSheet,
  View,
  Linking,
  TextStyle,
} from 'react-native';
import type { Theme } from '@metamask/design-tokens';
import { connect, useSelector, useDispatch } from 'react-redux';
import ScrollableTabView, {
  ChangeTabProperties,
} from 'react-native-scrollable-tab-view';
import { baseStyles } from '../../../styles/common';
import Tokens from '../../UI/Tokens';
import { getWalletNavbarOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import TabBar from '../../../component-library/components-temp/TabBar';
import {
  isPastPrivacyPolicyDate,
  shouldShowNewPrivacyToastSelector,
  storePrivacyPolicyShownDate as storePrivacyPolicyShownDateAction,
  storePrivacyPolicyClickedOrClosed as storePrivacyPolicyClickedOrClosedAction,
} from '../../../reducers/legalNotices';
import { CONSENSYS_PRIVACY_POLICY } from '../../../constants/urls';
import StorageWrapper from '../../../store/storage-wrapper';
import { SOLANA_FEATURE_MODAL_SHOWN } from '../../../constants/storage';

import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import NotificationsService from '../../../util/notifications/services/NotificationService';
import Engine from '../../../core/Engine';
import CollectibleContracts from '../../UI/CollectibleContracts';
import { MetaMetricsEvents } from '../../../core/Analytics';
import ErrorBoundary from '../ErrorBoundary';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import {
  getDecimalChainId,
  getIsNetworkOnboarded,
  isPortfolioViewEnabled,
  isTestNet,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectNetworkClientId,
  selectNetworkConfigurations,
  selectProviderConfig,
  selectNativeCurrencyByChainId,
} from '../../../selectors/networkController';
import {
  selectNetworkName,
  selectNetworkImageSource,
} from '../../../selectors/networkInfos';
import {
  selectAllDetectedTokensFlat,
  selectDetectedTokens,
} from '../../../selectors/tokensController';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import CustomText, {
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { RootState } from '../../../reducers';
import usePrevious from '../../hooks/usePrevious';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountFormattedAddress,
} from '../../../selectors/accountsController';
import { selectAccountBalanceByChainId } from '../../../selectors/accountTrackerController';
import {
  hideNftFetchingLoadingIndicator as hideNftFetchingLoadingIndicatorAction,
  showNftFetchingLoadingIndicator as showNftFetchingLoadingIndicatorAction,
} from '../../../reducers/collectibles';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import {
  getMetamaskNotificationsUnreadCount,
  getMetamaskNotificationsReadCount,
  selectIsMetamaskNotificationsEnabled,
} from '../../../selectors/notifications';
import { selectIsBackupAndSyncEnabled } from '../../../selectors/identity';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { useAccountName } from '../../hooks/useAccountName';

import { PortfolioBalance } from '../../UI/Tokens/TokenList/PortfolioBalance';
import useCheckNftAutoDetectionModal from '../../hooks/useCheckNftAutoDetectionModal';
import useCheckMultiRpcModal from '../../hooks/useCheckMultiRpcModal';
import { useAccountsWithNetworkActivitySync } from '../../hooks/useAccountsWithNetworkActivitySync';
import {
  selectTokenNetworkFilter,
  selectUseTokenDetection,
} from '../../../selectors/preferencesController';
import { TokenI } from '../../UI/Tokens/types';
import { Hex } from '@metamask/utils';
import { Nft, Token } from '@metamask/assets-controllers';
import { Carousel } from '../../UI/Carousel';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { useNftDetectionChainIds } from '../../hooks/useNftDetectionChainIds';
import Logger from '../../../util/Logger';
import { cloneDeep } from 'lodash';
import { prepareNftDetectionEvents } from '../../../util/assets';
import DeFiPositionsList from '../../UI/DeFiPositions/DeFiPositionsList';
import { selectAssetsDefiPositionsEnabled } from '../../../selectors/featureFlagController/assetsDefiPositions';
import { toFormattedAddress } from '../../../util/address';
import { selectHDKeyrings } from '../../../selectors/keyringController';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { endTrace, trace, TraceName } from '../../../util/trace';
import AssetDetailsActions from '../AssetDetails/AssetDetailsActions';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../UI/Bridge/hooks/useSwapBridgeNavigation';
import { QRTabSwitcherScreens } from '../QRTabSwitcher';

import { newAssetTransaction } from '../../../actions/transaction';
import { getEther } from '../../../util/transactions';
import { swapsUtils } from '@metamask/swaps-controller';
import { isSwapsAllowed } from '../../UI/Swaps/utils';
import { isBridgeAllowed } from '../../UI/Bridge/utils';
import AppConstants from '../../../core/AppConstants';
import useRampNetwork from '../../UI/Ramp/Aggregator/hooks/useRampNetwork';
import {
  selectIsSwapsLive,
  selectIsUnifiedSwapsEnabled,
} from '../../../core/redux/slices/bridge';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { useSendNonEvmAsset } from '../../hooks/useSendNonEvmAsset';
///: END:ONLY_INCLUDE_IF
import { selectPerpsEnabledFlag } from '../../UI/Perps';
import PerpsTabView from '../../UI/Perps/Views/PerpsTabView';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { selectIsCardholder } from '../../../core/redux/slices/card';
import { selectIsConnectionRemoved } from '../../../reducers/user';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { setIsConnectionRemoved } from '../../../actions/user';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';
import { InitSendLocation } from '../confirmations/constants/send';
import { useSendNavigation } from '../confirmations/hooks/useSendNavigation';
import { selectSolanaOnboardingModalEnabled } from '../../../selectors/multichain/multichain';
import { selectCarouselBannersFlag } from '../../UI/Carousel/selectors/featureFlags';

const createStyles = ({ colors }: Theme) =>
  RNStyleSheet.create({
    base: {
      paddingHorizontal: 16,
    },
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    walletAccount: { marginTop: 28 },
    tabBar: {
      marginBottom: 8,
    },
    tabContainer: {
      paddingHorizontal: 16,
      flex: 1,
    },
    loader: {
      backgroundColor: colors.background.default,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    banner: {
      marginTop: 20,
      paddingHorizontal: 16,
    },
    carouselContainer: {
      marginBottom: 12,
    },
    tabStyle: {
      paddingBottom: 8,
      paddingVertical: 8,
    },
  });

interface WalletProps {
  navigation: NavigationProp<ParamListBase>;
  storePrivacyPolicyShownDate: () => void;
  shouldShowNewPrivacyToast: boolean;
  currentRouteName: string;
  storePrivacyPolicyClickedOrClosed: () => void;
  showNftFetchingLoadingIndicator: () => void;
  hideNftFetchingLoadingIndicator: () => void;
}

const WalletTokensTabView = React.memo(
  (props: {
    navigation: WalletProps['navigation'];
    onChangeTab: (value: ChangeTabProperties) => void;
    defiEnabled: boolean;
    collectiblesEnabled: boolean;
  }) => {
    const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
    const { navigation, onChangeTab, defiEnabled, collectiblesEnabled } = props;

    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const renderTabBar = useCallback(
      (tabBarProps: Record<string, unknown>) => (
        <TabBar
          style={styles.tabBar}
          {...tabBarProps}
          tabStyle={styles.tabStyle}
          textStyle={{
            ...(theme.typography.sBodySMBold as TextStyle),
          }}
        />
      ),
      [styles, theme],
    );

    const tokensTabProps = useMemo(
      () => ({
        key: 'tokens-tab',
        tabLabel: strings('wallet.tokens'),
        navigation,
      }),
      [navigation],
    );

    const perpsTabProps = useMemo(
      () => ({
        key: 'perps-tab',
        tabLabel: strings('wallet.perps'),
        navigation,
      }),
      [navigation],
    );

    const defiPositionsTabProps = useMemo(
      () => ({
        key: 'defi-tab',
        tabLabel: strings('wallet.defi'),
        navigation,
      }),
      [navigation],
    );

    const collectibleContractsTabProps = useMemo(
      () => ({
        key: 'nfts-tab',
        tabLabel: strings('wallet.collectibles'),
        navigation,
      }),
      [navigation],
    );

    return (
      <View style={styles.tabContainer}>
        <ScrollableTabView
          renderTabBar={renderTabBar}
          onChangeTab={onChangeTab}
        >
          <Tokens {...tokensTabProps} key={tokensTabProps.key} />
          {isPerpsEnabled && (
            <PerpsTabView {...perpsTabProps} key={perpsTabProps.key} />
          )}
          {defiEnabled && (
            <DeFiPositionsList
              {...defiPositionsTabProps}
              key={defiPositionsTabProps.key}
            />
          )}
          {collectiblesEnabled && (
            <CollectibleContracts
              {...collectibleContractsTabProps}
              key={collectibleContractsTabProps.key}
            />
          )}
        </ScrollableTabView>
      </View>
    );
  },
);

/**
 * Main view for the wallet
 */
const Wallet = ({
  navigation,
  storePrivacyPolicyShownDate,
  shouldShowNewPrivacyToast,
  storePrivacyPolicyClickedOrClosed,
  showNftFetchingLoadingIndicator,
  hideNftFetchingLoadingIndicator,
}: WalletProps) => {
  const { navigate } = useNavigation();
  const walletRef = useRef(null);
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder, addTraitsToUser } = useMetrics();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { colors } = theme;
  const dispatch = useDispatch();
  const { navigateToSendPage } = useSendNavigation();

  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const solanaOnboardingModalEnabled = useSelector(
    selectSolanaOnboardingModalEnabled,
  );

  /**
   * Object containing the balance of the current selected account
   */
  const accountBalanceByChainId = useSelector(selectAccountBalanceByChainId);

  /**
   * A string that represents the selected address
   */
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  /**
   * Provider configuration for the current selected network
   */
  const providerConfig = useSelector(selectProviderConfig);
  const chainId = useSelector(selectChainId);

  const prevChainId = usePrevious(chainId);

  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, chainId),
  );

  const [isNetworkRampSupported] = useRampNetwork();
  const swapsIsLive = useSelector((state: RootState) =>
    selectIsSwapsLive(state, chainId),
  );
  const isUnifiedSwapsEnabled = useSelector(selectIsUnifiedSwapsEnabled);

  // Setup for AssetDetailsActions
  const { goToBridge, goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TabBar,
    sourcePage: 'MainView',
    sourceToken: {
      address: swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
      chainId: chainId as Hex,
      decimals: 18,
      symbol: nativeCurrency || 'ETH',
      name: nativeCurrency || 'Ethereum',
      image: '',
    },
  });

  // Hook for handling non-EVM asset sending
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const { sendNonEvmAsset } = useSendNonEvmAsset({
    asset: {
      chainId: chainId as string,
      address: undefined,
    },
  });
  ///: END:ONLY_INCLUDE_IF

  const displayFundButton = isNetworkRampSupported;
  const displaySwapsButton =
    AppConstants.SWAPS.ACTIVE && isSwapsAllowed(chainId);
  const displayBridgeButton =
    !isUnifiedSwapsEnabled &&
    AppConstants.BRIDGE.ACTIVE &&
    isBridgeAllowed(chainId);

  const onReceive = useCallback(() => {
    navigate(Routes.QR_TAB_SWITCHER, {
      initialScreen: QRTabSwitcherScreens.Receive,
    });
  }, [navigate]);

  const onSend = useCallback(async () => {
    try {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      // Try non-EVM first, if handled, return early
      const wasHandledAsNonEvm = await sendNonEvmAsset(
        InitSendLocation.HomePage,
      );
      if (wasHandledAsNonEvm) {
        return;
      }
      ///: END:ONLY_INCLUDE_IF

      // Ensure consistent transaction initialization before navigation
      if (nativeCurrency) {
        // Initialize transaction with native currency
        dispatch(newAssetTransaction(getEther(nativeCurrency)));
      } else {
        // Initialize with a default ETH transaction as fallback
        // This ensures consistent state even when nativeCurrency is not available
        console.warn(
          'Native currency not available, using ETH as fallback for transaction initialization',
        );
        dispatch(newAssetTransaction(getEther('ETH')));
      }

      // Navigate to send flow after successful transaction initialization
      navigateToSendPage(InitSendLocation.HomePage);
    } catch (error) {
      // Handle any errors that occur during the send flow initiation
      console.error('Error initiating send flow:', error);

      // Still attempt to navigate to maintain user flow, but without transaction initialization
      // The SendFlow view should handle the lack of initialized transaction gracefully
      navigateToSendPage(InitSendLocation.HomePage);
    }
  }, [
    nativeCurrency,
    navigateToSendPage,
    dispatch,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    sendNonEvmAsset,
    ///: END:ONLY_INCLUDE_IF
  ]);

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );
  /**
   * Is basic functionality enabled
   */
  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );

  const assetsDefiPositionsEnabled = useSelector(
    selectAssetsDefiPositionsEnabled,
  );

  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);

  const { isEnabled: getParticipationInMetaMetrics } = useMetrics();

  const isParticipatingInMetaMetrics = getParticipationInMetaMetrics();

  const currentToast = toastRef?.current;

  const hdKeyrings = useSelector(selectHDKeyrings);

  const accountName = useAccountName();
  useAccountsWithNetworkActivitySync();

  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const { selectNetwork } = useNetworkSelection({
    networks,
  });

  useEffect(() => {
    if (
      isDataCollectionForMarketingEnabled === null &&
      isParticipatingInMetaMetrics &&
      isPastPrivacyPolicyDate
    ) {
      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.EXPERIENCE_ENHANCER,
      });
    }
  }, [
    isDataCollectionForMarketingEnabled,
    isParticipatingInMetaMetrics,
    navigate,
  ]);

  const checkAndNavigateToSolanaFeature = useCallback(async () => {
    const hasSeenModal = await StorageWrapper.getItem(
      SOLANA_FEATURE_MODAL_SHOWN,
    );

    if (hasSeenModal !== 'true') {
      navigate(Routes.SOLANA_NEW_FEATURE_CONTENT);
    }
  }, [navigate]);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  useEffect(() => {
    if (solanaOnboardingModalEnabled) {
      checkAndNavigateToSolanaFeature();
    }
  }, [checkAndNavigateToSolanaFeature, solanaOnboardingModalEnabled]);
  ///: END:ONLY_INCLUDE_IF

  useEffect(() => {
    addTraitsToUser({
      [UserProfileProperty.NUMBER_OF_HD_ENTROPIES]: hdKeyrings.length,
    });
  }, [addTraitsToUser, hdKeyrings.length]);

  const isConnectionRemoved = useSelector(selectIsConnectionRemoved);
  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);

  useEffect(() => {
    if (isConnectionRemoved && isSocialLogin) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
        params: {
          title: strings('connection_removed_modal.title'),
          description: strings('connection_removed_modal.content'),
          primaryButtonLabel: strings('connection_removed_modal.tryAgain'),
          type: 'error',
          icon: IconName.Danger,
          iconColor: IconColor.Warning,
          isInteractable: false,
          closeOnPrimaryButtonPress: true,
          onPrimaryButtonPress: () => {
            dispatch(setIsConnectionRemoved(false));
          },
        },
      });
    }
  }, [navigation, isConnectionRemoved, dispatch, isSocialLogin]);

  useEffect(() => {
    if (!shouldShowNewPrivacyToast) return;

    storePrivacyPolicyShownDate();
    currentToast?.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [
        {
          label: strings(`privacy_policy.toast_message`),
          isBold: false,
        },
      ],
      closeButtonOptions: {
        label: strings(`privacy_policy.toast_action_button`),
        variant: ButtonVariants.Primary,
        onPress: () => {
          storePrivacyPolicyClickedOrClosed();
          currentToast?.closeToast();
        },
      },
      linkButtonOptions: {
        label: strings(`privacy_policy.toast_read_more`),
        onPress: () => {
          storePrivacyPolicyClickedOrClosed();
          currentToast?.closeToast();
          Linking.openURL(CONSENSYS_PRIVACY_POLICY);
        },
      },
      hasNoTimeout: true,
    });
  }, [
    storePrivacyPolicyShownDate,
    shouldShowNewPrivacyToast,
    storePrivacyPolicyClickedOrClosed,
    currentToast,
  ]);

  /**
   * Network onboarding state
   */
  const networkOnboardingState = useSelector(
    (state: RootState) => state.networkOnboarded.networkOnboardedState,
  );

  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);

  const unreadNotificationCount = useSelector(
    getMetamaskNotificationsUnreadCount,
  );

  const readNotificationCount = useSelector(getMetamaskNotificationsReadCount);
  const selectedNetworkName = useSelector(selectNetworkName);

  const networkName =
    networkConfigurations?.[chainId]?.name ?? selectedNetworkName;

  const networkImageSource = useSelector(selectNetworkImageSource);
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);
  const enabledEVMNetworks = useSelector(selectEVMEnabledNetworks);

  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);
  const isPopularNetworks = useSelector(selectIsPopularNetwork);
  const detectedTokens = useSelector(selectDetectedTokens) as TokenI[];
  const isCarouselBannersEnabled = useSelector(selectCarouselBannersFlag);

  const allDetectedTokens = useSelector(
    selectAllDetectedTokensFlat,
  ) as TokenI[];
  const currentDetectedTokens =
    isPortfolioViewEnabled() && isAllNetworks && isPopularNetworks
      ? allDetectedTokens
      : detectedTokens;
  const selectedNetworkClientId = useSelector(selectNetworkClientId);

  const chainIdsToDetectNftsFor = useNftDetectionChainIds();

  /**
   * Shows Nft auto detect modal if the user is on mainnet, never saw the modal and have nft detection off
   */
  useCheckNftAutoDetectionModal();

  /**
   * Show multi rpc modal if there are networks duplicated and if never showed before
   */
  useCheckMultiRpcModal();

  /**
   * Callback to trigger when pressing the navigation title.
   */
  const onTitlePress = useCallback(() => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.NETWORK_SELECTOR,
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NETWORK_SELECTOR_PRESSED)
        .addProperties({
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
  }, [navigate, chainId, trackEvent, createEventBuilder]);

  /**
   * Handle network filter called when app is mounted and tokenNetworkFilter is empty
   * TODO: [SOLANA] Check if this logic supports non evm networks before shipping Solana
   */
  const handleNetworkFilter = useCallback(() => {
    // TODO: Come back possibly just add the chain id of the eth
    // network as the default state instead of doing this
    const { PreferencesController } = Engine.context;
    if (Object.keys(tokenNetworkFilter).length === 0) {
      PreferencesController.setTokenNetworkFilter({
        [chainId]: true,
      });
    }
    if (
      isRemoveGlobalNetworkSelectorEnabled() &&
      enabledEVMNetworks.length === 0
    ) {
      selectNetwork(chainId);
    }
  }, [chainId, tokenNetworkFilter, selectNetwork, enabledEVMNetworks]);

  useEffect(() => {
    handleNetworkFilter();
  }, [chainId, handleNetworkFilter, enabledEVMNetworks]);

  /**
   * Check to see if notifications are enabled
   */
  useEffect(() => {
    async function checkIfNotificationsAreEnabled() {
      await NotificationsService.isDeviceNotificationEnabled();
    }
    checkIfNotificationsAreEnabled();
  });

  /**
   * Check to see if we need to show What's New modal
   */
  useEffect(() => {
    // TODO: [SOLANA] Revisit this before shipping, we need to check if this logic supports non evm networks
    const networkOnboarded = getIsNetworkOnboarded(
      chainId,
      networkOnboardingState,
    );

    if (!networkOnboarded && prevChainId !== chainId) {
      // Do not check since it will conflict with the onboarding and/or network onboarding
      return;
    }
  }, [
    navigation,
    chainId,
    // TODO: Is this providerConfig.rpcUrl needed in this useEffect dependencies?
    providerConfig.rpcUrl,
    networkOnboardingState,
    prevChainId,
    // TODO: Is this accountBalanceByChainId?.balance needed in this useEffect dependencies?
    accountBalanceByChainId?.balance,
  ]);

  useEffect(
    () => {
      requestAnimationFrame(async () => {
        const { AccountTrackerController } = Engine.context;

        const networkClientIDs = Object.values(evmNetworkConfigurations)
          .map(
            ({ defaultRpcEndpointIndex, rpcEndpoints }) =>
              rpcEndpoints[defaultRpcEndpointIndex].networkClientId,
          )
          .filter((c) => Boolean(c));

        AccountTrackerController.refresh(networkClientIDs);
      });
    },
    /* eslint-disable-next-line */
    // TODO: The need of usage of this chainId as a dependency is not clear, we shouldn't need to refresh the native balances when the chainId changes. Since the pooling is always working in the back. Check with assets team.
    // TODO: [SOLANA] Check if this logic supports non evm networks before shipping Solana
    [navigation, chainId, evmNetworkConfigurations],
  );

  const isCardholder = useSelector(selectIsCardholder);

  useEffect(() => {
    if (!selectedInternalAccount) return;
    navigation.setOptions(
      getWalletNavbarOptions(
        walletRef,
        selectedInternalAccount,
        accountName,
        networkName,
        networkImageSource,
        onTitlePress,
        navigation,
        colors,
        isNotificationEnabled,
        isBackupAndSyncEnabled,
        unreadNotificationCount,
        readNotificationCount,
        isCardholder,
      ),
    );
  }, [
    selectedInternalAccount,
    accountName,
    networkName,
    networkImageSource,
    onTitlePress,
    navigation,
    colors,
    isNotificationEnabled,
    isBackupAndSyncEnabled,
    unreadNotificationCount,
    readNotificationCount,
    isCardholder,
  ]);

  const getTokenAddedAnalyticsParams = useCallback(
    ({ address, symbol }: { address: string; symbol: string }) => {
      try {
        return {
          token_address: address,
          token_symbol: symbol,
          chain_id: getDecimalChainId(chainId),
          source: 'Add token dropdown',
        };
      } catch (error) {
        Logger.error(
          error as Error,
          'SearchTokenAutocomplete.getTokenAddedAnalyticsParams',
        );
        return undefined;
      }
    },
    [chainId],
  );

  useEffect(() => {
    const importAllDetectedTokens = async () => {
      // If autodetect tokens toggle is OFF, return
      if (!isTokenDetectionEnabled) {
        return;
      }
      const { TokensController } = Engine.context;
      if (
        Array.isArray(currentDetectedTokens) &&
        currentDetectedTokens.length > 0
      ) {
        if (isPortfolioViewEnabled()) {
          // Group tokens by their `chainId` using a plain object
          const tokensByChainId: Record<Hex, Token[]> = {};

          for (const token of currentDetectedTokens) {
            // TODO: [SOLANA] Check if this logic supports non evm networks before shipping Solana
            const tokenChainId: Hex =
              (token as TokenI & { chainId: Hex }).chainId ?? chainId;

            if (!tokensByChainId[tokenChainId]) {
              tokensByChainId[tokenChainId] = [];
            }

            tokensByChainId[tokenChainId].push(token);
          }

          // Process grouped tokens in parallel
          const importPromises = Object.entries(tokensByChainId).map(
            async ([networkId, allTokens]) => {
              const chainConfig = evmNetworkConfigurations[networkId as Hex];
              const { defaultRpcEndpointIndex } = chainConfig;
              const { networkClientId: networkInstanceId } =
                chainConfig.rpcEndpoints[defaultRpcEndpointIndex];

              await TokensController.addTokens(allTokens, networkInstanceId);
            },
          );

          await Promise.all(importPromises);
        } else {
          await TokensController.addTokens(
            currentDetectedTokens,
            selectedNetworkClientId,
          );
        }

        currentDetectedTokens.forEach(
          ({ address, symbol }: { address: string; symbol: string }) => {
            const analyticsParams = getTokenAddedAnalyticsParams({
              address,
              symbol,
            });

            if (analyticsParams) {
              trackEvent(
                createEventBuilder(MetaMetricsEvents.TOKEN_ADDED)
                  .addProperties({
                    token_address: address,
                    token_symbol: symbol,
                    chain_id: getDecimalChainId(chainId),
                    source: 'detected',
                  })
                  .build(),
              );
            }
          },
        );
      }
    };
    importAllDetectedTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isTokenDetectionEnabled,
    evmNetworkConfigurations,
    chainId,
    currentDetectedTokens,
    selectedNetworkClientId,
  ]);

  const getNftDetectionAnalyticsParams = useCallback((nft: Nft) => {
    try {
      return {
        chain_id: getDecimalChainId(nft.chainId),
        source: 'detected' as const,
      };
    } catch (error) {
      Logger.error(error as Error, 'Wallet.getNftDetectionAnalyticsParams');
      return undefined;
    }
  }, []);

  const onChangeTab = useCallback(
    async (obj: ChangeTabProperties) => {
      if (obj.ref.props.tabLabel === strings('wallet.tokens')) {
        trackEvent(createEventBuilder(MetaMetricsEvents.WALLET_TOKENS).build());
      } else if (obj.ref.props.tabLabel === strings('wallet.defi')) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.DEFI_TAB_SELECTED).build(),
        );
      } else {
        // Return early if no address selected
        if (!selectedAddress) return;

        const formattedSelectedAddress = toFormattedAddress(selectedAddress);

        trackEvent(
          createEventBuilder(MetaMetricsEvents.WALLET_COLLECTIBLES).build(),
        );
        // Call detect nfts
        const { NftDetectionController, NftController } = Engine.context;
        const previousNfts = cloneDeep(
          NftController.state.allNfts[formattedSelectedAddress],
        );

        try {
          trace({ name: TraceName.DetectNfts });
          showNftFetchingLoadingIndicator();
          await NftDetectionController.detectNfts(chainIdsToDetectNftsFor);
          endTrace({ name: TraceName.DetectNfts });
        } finally {
          hideNftFetchingLoadingIndicator();
        }

        const newNfts = cloneDeep(
          NftController.state.allNfts[formattedSelectedAddress],
        );

        const eventParams = prepareNftDetectionEvents(
          previousNfts,
          newNfts,
          getNftDetectionAnalyticsParams,
        );
        eventParams.forEach((params) => {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.COLLECTIBLE_ADDED)
              .addProperties({
                chain_id: params.chain_id,
                source: params.source,
              })
              .build(),
          );
        });
      }
    },
    [
      trackEvent,
      createEventBuilder,
      selectedAddress,
      showNftFetchingLoadingIndicator,
      chainIdsToDetectNftsFor,
      hideNftFetchingLoadingIndicator,
      getNftDetectionAnalyticsParams,
    ],
  );

  const turnOnBasicFunctionality = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  }, [navigation]);

  const defiEnabled =
    isEvmSelected &&
    !isTestNet(chainId) &&
    basicFunctionalityEnabled &&
    assetsDefiPositionsEnabled;

  const renderContent = useCallback(
    () => (
      <View
        style={styles.wrapper}
        testID={WalletViewSelectorsIDs.WALLET_CONTAINER}
      >
        {!basicFunctionalityEnabled ? (
          <View style={styles.banner}>
            <BannerAlert
              severity={BannerAlertSeverity.Error}
              title={strings('wallet.banner.title')}
              description={
                <CustomText
                  color={TextColor.Info}
                  onPress={turnOnBasicFunctionality}
                >
                  {strings('wallet.banner.link')}
                </CustomText>
              }
            />
          </View>
        ) : null}
        <>
          <PortfolioBalance />
          <AssetDetailsActions
            displayFundButton={displayFundButton}
            displaySwapsButton={displaySwapsButton}
            displayBridgeButton={displayBridgeButton}
            swapsIsLive={swapsIsLive}
            goToBridge={goToBridge}
            goToSwaps={goToSwaps}
            onReceive={onReceive}
            onSend={onSend}
            fundButtonActionID={WalletViewSelectorsIDs.WALLET_FUND_BUTTON}
            swapButtonActionID={WalletViewSelectorsIDs.WALLET_SWAP_BUTTON}
            bridgeButtonActionID={WalletViewSelectorsIDs.WALLET_BRIDGE_BUTTON}
            sendButtonActionID={WalletViewSelectorsIDs.WALLET_SEND_BUTTON}
            receiveButtonActionID={WalletViewSelectorsIDs.WALLET_RECEIVE_BUTTON}
          />
          {isCarouselBannersEnabled && (
            <Carousel style={styles.carouselContainer} />
          )}

          <WalletTokensTabView
            navigation={navigation}
            onChangeTab={onChangeTab}
            defiEnabled={defiEnabled}
            collectiblesEnabled={isEvmSelected}
          />
        </>
      </View>
    ),
    [
      styles.banner,
      styles.carouselContainer,
      styles.wrapper,
      basicFunctionalityEnabled,
      defiEnabled,
      isEvmSelected,
      turnOnBasicFunctionality,
      onChangeTab,
      navigation,
      goToBridge,
      goToSwaps,
      displayFundButton,
      displaySwapsButton,
      displayBridgeButton,
      swapsIsLive,
      onReceive,
      onSend,
      isCarouselBannersEnabled,
    ],
  );
  const renderLoader = useCallback(
    () => (
      <View style={styles.loader}>
        <ActivityIndicator size="small" />
      </View>
    ),
    [styles],
  );

  return (
    <ErrorBoundary navigation={navigation} view="Wallet">
      <View style={baseStyles.flexGrow}>
        {selectedInternalAccount ? renderContent() : renderLoader()}
      </View>
    </ErrorBoundary>
  );
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapStateToProps = (state: any) => ({
  shouldShowNewPrivacyToast: shouldShowNewPrivacyToastSelector(state),
});

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapDispatchToProps = (dispatch: any) => ({
  storePrivacyPolicyShownDate: () =>
    dispatch(storePrivacyPolicyShownDateAction(Date.now())),
  storePrivacyPolicyClickedOrClosed: () =>
    dispatch(storePrivacyPolicyClickedOrClosedAction()),
  showNftFetchingLoadingIndicator: () =>
    dispatch(showNftFetchingLoadingIndicatorAction()),
  hideNftFetchingLoadingIndicator: () =>
    dispatch(hideNftFetchingLoadingIndicatorAction()),
});

export default connect(mapStateToProps, mapDispatchToProps)(Wallet);
