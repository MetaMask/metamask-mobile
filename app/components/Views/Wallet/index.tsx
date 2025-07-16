import React, {
  useEffect,
  useRef,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  TextStyle,
  Linking,
} from 'react-native';
import type { Theme } from '@metamask/design-tokens';
import { connect, useSelector } from 'react-redux';
import ScrollableTabView, {
  ChangeTabProperties,
} from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { baseStyles } from '../../../styles/common';
import Tokens from '../../UI/Tokens';
import { getWalletNavbarOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
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
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar';
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
} from '../../../util/networks';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectNetworkClientId,
  selectNetworkConfigurations,
  selectProviderConfig,
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
import Text, {
  TextColor,
  getFontFamily,
  TextVariant,
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

const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    walletAccount: { marginTop: 28 },
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.icon.default,
    },
    tabStyle: {
      paddingBottom: 8,
      paddingVertical: 8,
    },
    tabBar: {
      borderColor: colors.background.default,
      marginBottom: 8,
    },
    textStyle: {
      ...(typography.sBodyMD as TextStyle),
      fontFamily: getFontFamily(TextVariant.BodyMD),
      fontWeight: '500',
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
      marginTop: 12,
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
    const { navigation, onChangeTab, defiEnabled, collectiblesEnabled } = props;

    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { colors } = theme;

    const renderTabBar = useCallback(
      (tabBarProps: Record<string, unknown>) => (
        <DefaultTabBar
          underlineStyle={styles.tabUnderlineStyle}
          activeTextColor={colors.text.default}
          inactiveTextColor={colors.text.alternative}
          backgroundColor={colors.background.default}
          tabStyle={styles.tabStyle}
          textStyle={styles.textStyle}
          style={styles.tabBar}
          tabPadding={32}
          {...tabBarProps}
        />
      ),
      [styles, colors],
    );

    const tokensTabProps = useMemo(
      () => ({
        key: 'tokens-tab',
        tabLabel: strings('wallet.tokens'),
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
      <ScrollableTabView renderTabBar={renderTabBar} onChangeTab={onChangeTab}>
        <Tokens {...tokensTabProps} />
        {defiEnabled && <DeFiPositionsList {...defiPositionsTabProps} />}
        {collectiblesEnabled && (
          <CollectibleContracts {...collectibleContractsTabProps} />
        )}
      </ScrollableTabView>
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

  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
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

  const accountAvatarType = useSelector((state: RootState) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

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
    checkAndNavigateToSolanaFeature();
  }, [checkAndNavigateToSolanaFeature]);
  ///: END:ONLY_INCLUDE_IF

  useEffect(() => {
    addTraitsToUser({
      [UserProfileProperty.NUMBER_OF_HD_ENTROPIES]: hdKeyrings.length,
    });
  }, [addTraitsToUser, hdKeyrings.length]);

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
  const name = useSelector(selectNetworkName);

  const networkName = networkConfigurations?.[chainId]?.name ?? name;

  const networkImageSource = useSelector(selectNetworkImageSource);
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);

  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);
  const isPopularNetworks = useSelector(selectIsPopularNetwork);
  const detectedTokens = useSelector(selectDetectedTokens) as TokenI[];

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
  }, [chainId, tokenNetworkFilter]);

  useEffect(() => {
    handleNetworkFilter();
  }, [chainId, handleNetworkFilter]);

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

        Object.values(evmNetworkConfigurations).forEach(
          ({ defaultRpcEndpointIndex, rpcEndpoints }) => {
            AccountTrackerController.refresh([
              rpcEndpoints[defaultRpcEndpointIndex].networkClientId,
            ]);
          },
        );
      });
    },
    /* eslint-disable-next-line */
    // TODO: The need of usage of this chainId as a dependency is not clear, we shouldn't need to refresh the native balances when the chainId changes. Since the pooling is always working in the back. Check with assets team.
    // TODO: [SOLANA] Check if this logic supports non evm networks before shipping Solana
    [navigation, chainId, evmNetworkConfigurations],
  );

  useEffect(() => {
    if (!selectedInternalAccount) return;
    navigation.setOptions(
      getWalletNavbarOptions(
        walletRef,
        selectedInternalAccount,
        accountName,
        accountAvatarType,
        networkName,
        networkImageSource,
        onTitlePress,
        navigation,
        colors,
        isNotificationEnabled,
        isBackupAndSyncEnabled,
        unreadNotificationCount,
        readNotificationCount,
      ),
    );
  }, [
    selectedInternalAccount,
    accountName,
    accountAvatarType,
    navigation,
    colors,
    networkName,
    networkImageSource,
    onTitlePress,
    isNotificationEnabled,
    isBackupAndSyncEnabled,
    unreadNotificationCount,
    readNotificationCount,
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
                <Text color={TextColor.Info} onPress={turnOnBasicFunctionality}>
                  {strings('wallet.banner.link')}
                </Text>
              }
            />
          </View>
        ) : null}
        <>
          <PortfolioBalance />
          <Carousel style={styles.carouselContainer} />
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
