import React, { useEffect, useRef, useCallback, useContext } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  TextStyle,
  InteractionManager,
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
  shouldShowNewPrivacyToastSelector,
  storePrivacyPolicyShownDate as storePrivacyPolicyShownDateAction,
  storePrivacyPolicyClickedOrClosed as storePrivacyPolicyClickedOrClosedAction,
} from '../../../reducers/legalNotices';
import { CONSENSYS_PRIVACY_POLICY } from '../../../constants/urls';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import Engine from '../../../core/Engine';
import CollectibleContracts from '../../UI/CollectibleContracts';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { getTicker } from '../../../util/transactions';
import OnboardingWizard from '../../UI/OnboardingWizard';
import ErrorBoundary from '../ErrorBoundary';
import { useTheme } from '../../../util/theme';
import {
  shouldShowSmartTransactionsOptInModal,
  shouldShowWhatsNewModal,
} from '../../../util/onboarding';
import Logger from '../../../util/Logger';
import Routes from '../../../constants/navigation/Routes';
import {
  getDecimalChainId,
  getIsNetworkOnboarded,
} from '../../../util/networks';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  selectProviderConfig,
  selectTicker,
} from '../../../selectors/networkController';
import {
  selectNetworkName,
  selectNetworkImageSource,
} from '../../../selectors/networkInfos';
import { selectTokens } from '../../../selectors/tokensController';
import { useNavigation } from '@react-navigation/native';
import { WalletAccount } from '../../../components/UI/WalletAccount';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import Text, {
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { RootState } from '../../../reducers';
import usePrevious from '../../hooks/usePrevious';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../selectors/accountsController';
import { selectAccountBalanceByChainId } from '../../../selectors/accountTrackerController';

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
      paddingBottom: 0,
      paddingVertical: 8,
    },
    tabBar: {
      borderColor: colors.background.default,
      marginTop: 16,
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

/**
 * Main view for the wallet
 */
const Wallet = ({
  navigation,
  storePrivacyPolicyShownDate,
  shouldShowNewPrivacyToast,
  storePrivacyPolicyClickedOrClosed,
}: any) => {
  const { navigate } = useNavigation();
  const walletRef = useRef(null);
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent } = useMetrics();
  const styles = createStyles(theme);
  const { colors } = theme;

  /**
   * Object containing the balance of the current selected account
   */
  const accountBalanceByChainId = useSelector(selectAccountBalanceByChainId);

  /**
   * ETH to current currency conversion rate
   */
  const conversionRate = useSelector(selectConversionRate);
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
  const wizardStep = useSelector((state: any) => state.wizard.step);
  /**
   * Provider configuration for the current selected network
   */
  const providerConfig = useSelector(selectProviderConfig);
  const prevChainId = usePrevious(providerConfig.chainId);
  /**
   * Is basic functionality enabled
   */
  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );

  const currentToast = toastRef?.current;

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
    (state: any) => state.networkOnboarded.networkOnboardedState,
  );

  const isNotificationEnabled = useSelector(
    (state: any) => state.notification?.notificationsSettings?.isEnabled,
  );

  const networkName = useSelector(selectNetworkName);

  const networkImageSource = useSelector(selectNetworkImageSource);

  /**
   * Callback to trigger when pressing the navigation title.
   */
  const onTitlePress = useCallback(() => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.NETWORK_SELECTOR,
    });
    trackEvent(MetaMetricsEvents.NETWORK_SELECTOR_PRESSED, {
      chain_id: getDecimalChainId(providerConfig.chainId),
    });
  }, [navigate, providerConfig.chainId, trackEvent]);

  /**
   * Check to see if we need to show What's New modal and Smart Transactions Opt In modal
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

    const checkWhatsNewModal = async () => {
      try {
        const shouldShowWhatsNew = await shouldShowWhatsNewModal();
        if (shouldShowWhatsNew) {
          navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
            screen: Routes.MODAL.WHATS_NEW,
          });
        }
      } catch (error) {
        Logger.log(error, "Error while checking What's New modal!");
      }
    };

    // Show STX opt in modal before What's New modal
    // Fired on the first load of the wallet and also on network switch
    const checkSmartTransactionsOptInModal = async () => {
      try {
        const showShowStxOptInModal =
          await shouldShowSmartTransactionsOptInModal(
            providerConfig.chainId,
            providerConfig.rpcUrl,
          );
        if (showShowStxOptInModal) {
          navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
            screen: Routes.MODAL.SMART_TRANSACTIONS_OPT_IN,
          });
        } else {
          await checkWhatsNewModal();
        }
      } catch (error) {
        Logger.log(
          error,
          'Error while checking Smart Tranasctions Opt In modal!',
        );
      }
    };

    InteractionManager.runAfterInteractions(() => {
      checkSmartTransactionsOptInModal();
    });
  }, [
    wizardStep,
    navigation,
    providerConfig.chainId,
    providerConfig.rpcUrl,
    networkOnboardingState,
    prevChainId,
  ]);

  useEffect(
    () => {
      requestAnimationFrame(async () => {
        const {
          TokenDetectionController,
          NftDetectionController,
          AccountTrackerController,
        } = Engine.context as any;
        TokenDetectionController.detectTokens();
        NftDetectionController.detectNfts();
        AccountTrackerController.refresh();
      });
    },
    /* eslint-disable-next-line */
    [navigation, providerConfig.chainId],
  );

  useEffect(() => {
    navigation.setOptions(
      getWalletNavbarOptions(
        networkName,
        networkImageSource,
        onTitlePress,
        navigation,
        colors,
        isNotificationEnabled,
      ),
    );
    /* eslint-disable-next-line */
  }, [
    navigation,
    colors,
    networkName,
    networkImageSource,
    onTitlePress,
    isNotificationEnabled,
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
    (obj) => {
      if (obj.ref.props.tabLabel === strings('wallet.tokens')) {
        trackEvent(MetaMetricsEvents.WALLET_TOKENS);
      } else {
        trackEvent(MetaMetricsEvents.WALLET_COLLECTIBLES);
      }
    },
    [trackEvent],
  );

  const turnOnBasicFunctionality = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  }, [navigation]);

  const renderContent = useCallback(() => {
    let balance: any = 0;
    let assets = tokens;

    if (accountBalanceByChainId) {
      balance = renderFromWei(accountBalanceByChainId.balance);

      assets = [
        {
          // TODO: Add name property to Token interface in controllers.
          name: getTicker(ticker) === 'ETH' ? 'Ethereum' : ticker,
          symbol: getTicker(ticker),
          isETH: true,
          balance,
          balanceFiat: weiToFiat(
            hexToBN(accountBalanceByChainId.balance) as any,
            conversionRate,
            currentCurrency,
          ),
          logo: '../images/eth-logo-new.png',
        } as any,
        ...(tokens || []),
      ];
    } else {
      assets = tokens;
    }
    return (
      <View style={styles.wrapper}>
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
        {selectedAddress ? (
          <WalletAccount style={styles.walletAccount} ref={walletRef} />
        ) : null}
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
      </View>
    );
  }, [
    tokens,
    accountBalanceByChainId,
    selectedAddress,
    styles.wrapper,
    styles.banner,
    styles.walletAccount,
    basicFunctionalityEnabled,
    turnOnBasicFunctionality,
    renderTabBar,
    onChangeTab,
    navigation,
    ticker,
    conversionRate,
    currentCurrency,
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
      <View style={baseStyles.flexGrow} {...generateTestId('wallet-screen')}>
        {selectedAddress ? renderContent() : renderLoader()}

        {renderOnboardingWizard()}
      </View>
    </ErrorBoundary>
  );
};

const mapStateToProps = (state: any) => ({
  shouldShowNewPrivacyToast: shouldShowNewPrivacyToastSelector(state),
});

const mapDispatchToProps = (dispatch: any) => ({
  storePrivacyPolicyShownDate: () =>
    dispatch(storePrivacyPolicyShownDateAction(Date.now())),
  storePrivacyPolicyClickedOrClosed: () =>
    dispatch(storePrivacyPolicyClickedOrClosedAction()),
});

export default connect(mapStateToProps, mapDispatchToProps)(Wallet);
