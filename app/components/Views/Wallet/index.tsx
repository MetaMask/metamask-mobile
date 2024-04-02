import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View, TextStyle } from 'react-native';
import type { Theme } from '@metamask/design-tokens';
import { useSelector } from 'react-redux';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { baseStyles } from '../../../styles/common';
import Tokens from '../../UI/Tokens';
import { getWalletNavbarOptions } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';
import {
  renderFromWei,
  weiToFiat,
  hexToBN,
  toHexadecimal,
} from '../../../util/number';
import Engine from '../../../core/Engine';
import CollectibleContracts from '../../UI/CollectibleContracts';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { getTicker } from '../../../util/transactions';
import OnboardingWizard from '../../UI/OnboardingWizard';
import ErrorBoundary from '../ErrorBoundary';
import { useTheme } from '../../../util/theme';
import { shouldShowWhatsNewModal } from '../../../util/onboarding';
import Logger from '../../../util/Logger';
import Routes from '../../../constants/navigation/Routes';
import {
  getDecimalChainId,
  getNetworkImageSource,
  getNetworkNameFromProviderConfig,
} from '../../../util/networks';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  selectProviderConfig,
  selectTicker,
} from '../../../selectors/networkController';
import { selectTokens } from '../../../selectors/tokensController';
import { useNavigation } from '@react-navigation/native';
import { WalletAccount } from '../../../components/UI/WalletAccount';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import { selectSelectedAddress } from '../../../selectors/preferencesController';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { useAccounts } from '../../hooks/useAccounts';

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
  });

/**
 * Main view for the wallet
 */
const Wallet = ({ navigation }: any) => {
  const { navigate } = useNavigation();
  const walletRef = useRef(null);
  const theme = useTheme();
  const { trackEvent } = useMetrics();
  const styles = createStyles(theme);
  const { colors } = theme;

  /**
   * Map of accountsByChainId to information objects including balances
   */
  const accountsByChainId = useSelector(selectAccountsByChainId);

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
  const selectedAddress = useSelector(selectSelectedAddress);
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

  /**
   * A list of all the user accounts and a mapping of ENS name to account address if they exist
   */
  const { accounts, ensByAccountAddress } = useAccounts();

  /**
   * An object representing the currently selected account.
   */
  const selectedAccount = useMemo(() => {
    if (accounts.length > 0) {
      return accounts.find((account) => account.isSelected);
    }
    return undefined;
  }, [accounts]);

  /**
   * ENS name for the currently selected account.
   * This value may be undefined if there is no corresponding ENS name for the account.
   */
  const ensForSelectedAccount = useMemo(() => {
    if (ensByAccountAddress && selectedAccount) {
      return ensByAccountAddress[selectedAccount.address];
    }
    return undefined;
  }, [ensByAccountAddress, selectedAccount]);

  const networkName = useMemo(
    () => getNetworkNameFromProviderConfig(providerConfig),
    [providerConfig],
  );

  const networkImageSource = useMemo(
    () =>
      getNetworkImageSource({
        networkType: providerConfig.type,
        chainId: providerConfig.chainId,
      }),
    [providerConfig],
  );

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
  const { colors: themeColors } = useTheme();

  /**
   * Check to see if we need to show What's New modal
   */
  useEffect(() => {
    if (wizardStep > 0) {
      // Do not check since it will conflict with the onboarding wizard
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
    checkWhatsNewModal();
  }, [wizardStep, navigation]);

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
        themeColors,
      ),
    );
    /* eslint-disable-next-line */
  }, [navigation, themeColors, networkName, networkImageSource, onTitlePress]);

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

  const renderContent = useCallback(() => {
    let balance: any = 0;
    let assets = tokens;

    if (
      accountsByChainId?.[toHexadecimal(providerConfig.chainId)]?.[
        selectedAddress
      ]
    ) {
      balance = renderFromWei(
        accountsByChainId[toHexadecimal(providerConfig.chainId)][
          selectedAddress
        ].balance,
      );

      assets = [
        {
          // TODO: Add name property to Token interface in controllers.
          name: getTicker(ticker) === 'ETH' ? 'Ethereum' : ticker,
          symbol: getTicker(ticker),
          isETH: true,
          balance,
          balanceFiat: weiToFiat(
            hexToBN(
              accountsByChainId[toHexadecimal(providerConfig.chainId)][
                selectedAddress
              ].balance,
            ) as any,
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
        {selectedAccount ? (
          <WalletAccount
            account={selectedAccount}
            ens={ensForSelectedAccount}
            style={styles.walletAccount}
            ref={walletRef}
          />
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
          {/* </View> */}
        </ScrollableTabView>
        {/* </View> */}
      </View>
    );
  }, [
    tokens,
    accountsByChainId,
    providerConfig.chainId,
    selectedAddress,
    styles.wrapper,
    styles.walletAccount,
    selectedAccount,
    ensForSelectedAccount,
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
      [1, 2, 3].includes(wizardStep) && (
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

export default Wallet;
