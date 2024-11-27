import React, { useEffect, useRef, useCallback, useContext } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  TextStyle,
  Linking,
} from 'react-native';
import type { Theme } from '@metamask/design-tokens';
import { connect, useSelector } from 'react-redux';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { baseStyles } from '../../../styles/common';
import Tokens from '../../UI/Tokens';
import { getWalletNavbarOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import { renderFromWei, weiToFiat, hexToBN } from '../../../util/number';
import {
  isPastPrivacyPolicyDate,
  shouldShowNewPrivacyToastSelector,
  storePrivacyPolicyShownDate as storePrivacyPolicyShownDateAction,
  storePrivacyPolicyClickedOrClosed as storePrivacyPolicyClickedOrClosedAction,
} from '../../../reducers/legalNotices';
import { CONSENSYS_PRIVACY_POLICY } from '../../../constants/urls';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar';
import NotificationsService from '../../../util/notifications/services/NotificationService';
import Engine from '../../../core/Engine';
import CollectibleContracts from '../../UI/CollectibleContracts';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { getTicker } from '../../../util/transactions';
import OnboardingWizard from '../../UI/OnboardingWizard';
import ErrorBoundary from '../ErrorBoundary';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import {
  getDecimalChainId,
  getIsNetworkOnboarded,
} from '../../../util/networks';
import {
  selectChainId,
  selectNetworkConfigurations,
  selectProviderConfig,
  selectTicker,
} from '../../../selectors/networkController';
import {
  selectNetworkName,
  selectNetworkImageSource,
} from '../../../selectors/networkInfos';
import { selectTokens } from '../../../selectors/tokensController';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import Text, {
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { RootState } from '../../../reducers';
import usePrevious from '../../hooks/usePrevious';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../selectors/accountsController';
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
  selectIsProfileSyncingEnabled,
} from '../../../selectors/notifications';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { useAccountName } from '../../hooks/useAccountName';

import { PortfolioBalance } from '../../UI/Tokens/TokenList/PortfolioBalance';
import useCheckNftAutoDetectionModal from '../../hooks/useCheckNftAutoDetectionModal';
import useCheckMultiRpcModal from '../../hooks/useCheckMultiRpcModal';
import { selectContractBalances } from '../../../selectors/tokenBalancesController';

const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    base: {
      paddingHorizontal: 16,
    },
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    walletAccount: { marginTop: 28 },
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.primary.default,
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
      fontWeight: '500',
    },
    loader: {
      backgroundColor: colors.background.default,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    banner: {
      widht: '80%',
      marginTop: 20,
      paddingHorizontal: 16,
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
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(theme);
  const { colors } = theme;

  const networkConfigurations = useSelector(selectNetworkConfigurations);

  /**
   * Object containing the balance of the current selected account
   */
  const accountBalanceByChainId = useSelector(selectAccountBalanceByChainId);

  /**
   * ETH to current currency conversion rate
   */
  const conversionRate = useSelector(selectConversionRate);
  const contractBalances = useSelector(selectContractBalances);
  /**
   * Currency code of the currently-active currency
   */
  const currentCurrency = useSelector(selectCurrentCurrency);
  /**
   * A string that represents the selected address
   */
  const selectedAddress = useSelector(
    selectSelectedInternalAccountChecksummedAddress,
  );
  /**
   * An array that represents the user tokens
   */
  const tokens = useSelector(selectTokens);
  /**
   * Current provider ticker
   */
  const ticker = useSelector(selectTicker);
  /**
   * Current onboarding wizard step
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wizardStep = useSelector((state: any) => state.wizard.step);
  /**
   * Provider configuration for the current selected network
   */
  const providerConfig = useSelector(selectProviderConfig);
  const prevChainId = usePrevious(providerConfig.chainId);

  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );
  /**
   * Is basic functionality enabled
   */
  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );

  const { isEnabled: getParticipationInMetaMetrics } = useMetrics();

  const isParticipatingInMetaMetrics = getParticipationInMetaMetrics();

  const currentToast = toastRef?.current;

  const accountName = useAccountName();

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

  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);

  const unreadNotificationCount = useSelector(
    getMetamaskNotificationsUnreadCount,
  );

  const readNotificationCount = useSelector(getMetamaskNotificationsReadCount);
  const chainId = useSelector(selectChainId);
  const name = useSelector(selectNetworkName);

  const networkName = networkConfigurations?.[chainId]?.name ?? name;

  const networkImageSource = useSelector(selectNetworkImageSource);
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
          chain_id: getDecimalChainId(providerConfig.chainId),
        })
        .build(),
    );
  }, [navigate, providerConfig.chainId, trackEvent, createEventBuilder]);

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
    const networkOnboarded = getIsNetworkOnboarded(
      providerConfig.chainId,
      networkOnboardingState,
    );

    if (
      wizardStep > 0 ||
      (!networkOnboarded && prevChainId !== providerConfig.chainId)
    ) {
      // Do not check since it will conflict with the onboarding wizard and/or network onboarding
      return;
    }
  }, [
    wizardStep,
    navigation,
    providerConfig.chainId,
    providerConfig.rpcUrl,
    networkOnboardingState,
    prevChainId,
    accountBalanceByChainId?.balance,
  ]);

  useEffect(
    () => {
      requestAnimationFrame(async () => {
        const { AccountTrackerController } = Engine.context;
        AccountTrackerController.refresh();
      });
    },
    /* eslint-disable-next-line */
    [navigation, providerConfig.chainId],
  );

  useEffect(() => {
    navigation.setOptions(
      getWalletNavbarOptions(
        walletRef,
        selectedAddress || '',
        accountName,
        accountAvatarType,
        networkName,
        networkImageSource,
        onTitlePress,
        navigation,
        colors,
        isNotificationEnabled,
        isProfileSyncingEnabled,
        unreadNotificationCount,
        readNotificationCount,
      ),
    );
    /* eslint-disable-next-line */
  }, [
    selectedAddress,
    accountName,
    accountAvatarType,
    navigation,
    colors,
    networkName,
    networkImageSource,
    onTitlePress,
    isNotificationEnabled,
    isProfileSyncingEnabled,
    unreadNotificationCount,
    readNotificationCount,
  ]);

  const renderTabBar = useCallback(
    (props) => (
      <View style={styles.base}>
        <DefaultTabBar
          underlineStyle={styles.tabUnderlineStyle}
          activeTextColor={colors.primary.default}
          inactiveTextColor={colors.text.default}
          backgroundColor={colors.background.default}
          tabStyle={styles.tabStyle}
          textStyle={styles.textStyle}
          tabPadding={16}
          style={styles.tabBar}
          {...props}
        />
      </View>
    ),
    [styles, colors],
  );

  const onChangeTab = useCallback(
    async (obj) => {
      if (obj.ref.props.tabLabel === strings('wallet.tokens')) {
        trackEvent(createEventBuilder(MetaMetricsEvents.WALLET_TOKENS).build());
      } else {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.WALLET_COLLECTIBLES).build(),
        );
        // Call detect nfts
        const { NftDetectionController } = Engine.context;
        try {
          showNftFetchingLoadingIndicator();
          await NftDetectionController.detectNfts();
        } finally {
          hideNftFetchingLoadingIndicator();
        }
      }
    },
    [
      trackEvent,
      hideNftFetchingLoadingIndicator,
      showNftFetchingLoadingIndicator,
      createEventBuilder,
    ],
  );

  const turnOnBasicFunctionality = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  }, [navigation]);

  const renderContent = useCallback(() => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let balance: any = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let stakedBalance: any = 0;

    const assets = [...(tokens || [])];

    if (accountBalanceByChainId) {
      balance = renderFromWei(accountBalanceByChainId.balance);
      const nativeAsset = {
        // TODO: Add name property to Token interface in controllers.
        name: getTicker(ticker) === 'ETH' ? 'Ethereum' : ticker,
        symbol: getTicker(ticker),
        isETH: true,
        balance,
        balanceFiat: weiToFiat(
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          hexToBN(accountBalanceByChainId.balance) as any,
          conversionRate,
          currentCurrency,
        ),
        logo: '../images/eth-logo-new.png',
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
      assets.push(nativeAsset);

      if (
        accountBalanceByChainId.stakedBalance &&
        !hexToBN(accountBalanceByChainId.stakedBalance).isZero()
      ) {
        stakedBalance = renderFromWei(accountBalanceByChainId.stakedBalance);
        const stakedAsset = {
          ...nativeAsset,
          nativeAsset,
          name: 'Staked Ethereum',
          isStaked: true,
          balance: stakedBalance,
          balanceFiat: weiToFiat(
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hexToBN(accountBalanceByChainId.stakedBalance) as any,
            conversionRate,
            currentCurrency,
          ),
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
        assets.push(stakedAsset);
      }
    }

    return (
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
          {accountBalanceByChainId && <PortfolioBalance />}
          <ScrollableTabView
            renderTabBar={renderTabBar}
            // eslint-disable-next-line react/jsx-no-bind
            onChangeTab={onChangeTab}
          >
            <Tokens
              tabLabel={strings('wallet.tokens')}
              key={'tokens-tab'}
              navigation={navigation}
              // TODO - Consolidate into the correct type.
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              tokens={assets}
            />
            <CollectibleContracts
              // TODO - Extend component to support injected tabLabel prop.
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              tabLabel={strings('wallet.collectibles')}
              key={'nfts-tab'}
              navigation={navigation}
            />
          </ScrollableTabView>
        </>
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tokens,
    accountBalanceByChainId,
    styles.wrapper,
    styles.banner,
    basicFunctionalityEnabled,
    turnOnBasicFunctionality,
    renderTabBar,
    onChangeTab,
    navigation,
    ticker,
    conversionRate,
    currentCurrency,
    contractBalances,
  ]);
  const renderLoader = useCallback(
    () => (
      <View style={styles.loader}>
        <ActivityIndicator size="small" />
      </View>
    ),
    [styles],
  );

  /**
   * Return current step of onboarding wizard if not step 5 nor 0
   */
  const renderOnboardingWizard = useCallback(
    () =>
      [1, 2, 3, 4, 5, 6, 7].includes(wizardStep) && (
        <OnboardingWizard
          navigation={navigation}
          coachmarkRef={walletRef.current}
        />
      ),
    [navigation, wizardStep],
  );

  return (
    <ErrorBoundary navigation={navigation} view="Wallet">
      <View style={baseStyles.flexGrow}>
        {selectedAddress ? renderContent() : renderLoader()}

        {renderOnboardingWizard()}
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
