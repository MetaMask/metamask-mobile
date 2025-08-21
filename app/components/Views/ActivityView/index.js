import React, { useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { useSelector } from 'react-redux';
import { useCurrentNetworkInfo } from '../../hooks/useCurrentNetworkInfo';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { isNonEvmAddress } from '../../../core/Multichain/utils';
import { getHasOrders } from '../../../reducers/fiatOrders';
import { getTransactionsNavbarOptions } from '../../UI/Navbar';
import TransactionsView from '../TransactionsView';
import MultichainTransactionsView from '../MultichainTransactionsView';
import TabBar from '../../Base/TabBar';
import { strings } from '../../../../locales/i18n';
import RampOrdersList from '../../UI/Ramp/Aggregator/Views/OrdersList';
import ErrorBoundary from '../ErrorBoundary';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { useParams } from '../../../util/navigation/navUtils';
import { createTokenBottomSheetFilterNavDetails } from '../../UI/Tokens/TokensBottomSheet';
import ButtonBase from '../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../util/networks';
import {
  selectChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../../selectors/networkController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '@metamask/design-tokens';
import { useStyles } from '../../hooks/useStyles';
import TextComponent, {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { createNetworkManagerNavDetails } from '../../UI/NetworkManager';
import PerpsTransactionsView from '../../UI/Perps/Views/PerpsTransactionsView';
import { PerpsConnectionProvider } from '../../UI/Perps/providers/PerpsConnectionProvider';
import { usePerpsPositions } from '../../UI/Perps/hooks';
import { usePerpsEligibility } from '../../UI/Perps/hooks/usePerpsEligibility';
import { selectPerpsEnabledFlag } from '../../UI/Perps';

const createStyles = (params) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    controlButtonOuterWrapper: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 8,
    },
    controlButton: {
      backgroundColor: colors.background.default,
      borderColor: !isRemoveGlobalNetworkSelectorEnabled()
        ? colors.border.default
        : undefined,
      borderStyle: 'solid',
      borderWidth: isRemoveGlobalNetworkSelectorEnabled() ? 0 : 1,
      marginLeft: isRemoveGlobalNetworkSelectorEnabled() ? 0 : 5,
      marginRight: 5,
      maxWidth: '60%',
      borderRadius: 20,
    },
    controlButtonDisabled: {
      backgroundColor: colors.background.default,
      borderColor: !isRemoveGlobalNetworkSelectorEnabled()
        ? colors.border.default
        : undefined,
      borderStyle: 'solid',
      borderWidth: isRemoveGlobalNetworkSelectorEnabled() ? 0 : 1,
      marginLeft: isRemoveGlobalNetworkSelectorEnabled() ? 0 : 5,
      marginRight: 5,
      maxWidth: '60%',
      opacity: 0.5,
      borderRadius: 20,
    },
    header: {
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      paddingHorizontal: 16,
    },
    title: {
      marginTop: 20,
      fontSize: 20,
      color: colors.text.default,
      ...typography.sHeadingMD,
      fontFamily: getFontFamily(TextVariant.HeadingMD),
    },
    titleText: {
      color: colors.text.default,
    },
  });
};

const ActivityView = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { styles } = useStyles(createStyles, {
    style: { marginTop: insets.top },
  });

  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const currentChainId = useSelector(selectChainId);
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isAllPopularEVMNetworks = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const networkName = useSelector(selectNetworkName);
  const hasOrders = useSelector((state) => getHasOrders(state) || false);
  const accountsByChainId = useSelector(selectAccountsByChainId);

  const { enabledNetworks, getNetworkInfo, isDisabled } =
    useCurrentNetworkInfo();

  const currentNetworkName = getNetworkInfo(0)?.networkName;

  const tabViewRef = useRef();
  const params = useParams();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  const openAccountSelector = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ACCOUNT_SELECTOR,
    });
    // Track Event: "Opened Acount Switcher"
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BROWSER_OPEN_ACCOUNT_SWITCH)
        .addProperties({
          number_of_accounts: Object.keys(
            accountsByChainId[selectedAddress] ?? {},
          ).length,
        })
        .build(),
    );
  }, [
    navigation,
    accountsByChainId,
    selectedAddress,
    trackEvent,
    createEventBuilder,
  ]);

  const showFilterControls = () => {
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      navigation.navigate(...createNetworkManagerNavDetails({}));
    } else {
      navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
    }
  };

  useEffect(
    () => {
      const title =
        hasOrders ?? false ? 'activity_view.title' : 'transactions_view.title';
      navigation.setOptions(
        getTransactionsNavbarOptions(
          title,
          colors,
          navigation,
          selectedAddress,
          openAccountSelector,
        ),
      );
    },
    /* eslint-disable-next-line */
    [navigation, hasOrders, colors, selectedAddress, openAccountSelector],
  );

  const renderTabBar = () =>
    hasOrders || isPerpsEnabled ? <TabBar /> : <View />;

  useFocusEffect(
    useCallback(() => {
      if (hasOrders && params.redirectToOrders) {
        const orderTabNumber = 1;
        navigation.setParams({ redirectToOrders: false });
        tabViewRef.current?.goToPage(orderTabNumber);
      } else if (isPerpsEnabled && params.redirectToPerpsTransactions) {
        const perpsTabNumber = isPerpsEnabled && hasOrders ? 2 : 1;
        navigation.setParams({ redirectToPerpsTransactions: false });
        tabViewRef.current?.goToPage(perpsTabNumber);
      }
    }, [
      hasOrders,
      navigation,
      params.redirectToOrders,
      isPerpsEnabled,
      params.redirectToPerpsTransactions,
    ]),
  );

  return (
    <ErrorBoundary navigation={navigation} view="ActivityView">
      <View style={[styles.header, { marginTop: insets.top }]}>
        <Text style={styles.title} variant={TextVariant.HeadingSM}>
          {strings('transactions_view.title')}
        </Text>
      </View>
      <View style={styles.wrapper}>
        <View style={styles.controlButtonOuterWrapper}>
          <ButtonBase
            testID={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
            label={
              <>
                {isRemoveGlobalNetworkSelectorEnabled() ? (
                  <TextComponent
                    variant={TextVariant.BodyMDMedium}
                    style={styles.titleText}
                    numberOfLines={1}
                  >
                    {enabledNetworks.length > 1
                      ? strings('networks.enabled_networks')
                      : currentNetworkName ?? strings('wallet.current_network')}
                  </TextComponent>
                ) : (
                  <TextComponent
                    variant={TextVariant.BodyMDMedium}
                    style={styles.titleText}
                    numberOfLines={1}
                  >
                    {isAllNetworks && isAllPopularEVMNetworks && isEvmSelected
                      ? strings('wallet.popular_networks')
                      : networkName ?? strings('wallet.current_network')}
                  </TextComponent>
                )}
              </>
            }
            isDisabled={isDisabled}
            onPress={isEvmSelected ? showFilterControls : () => null}
            endIconName={isEvmSelected ? IconName.ArrowDown : undefined}
            style={
              isDisabled ? styles.controlButtonDisabled : styles.controlButton
            }
            disabled={isDisabled}
          />
        </View>
        <ScrollableTabView
          ref={tabViewRef}
          renderTabBar={renderTabBar}
          locked={!hasOrders && !isPerpsEnabled}
        >
          {selectedAddress && isNonEvmAddress(selectedAddress) ? (
            <MultichainTransactionsView
              tabLabel={strings('transactions_view.title')}
              chainId={currentChainId}
            />
          ) : (
            <TransactionsView tabLabel={strings('transactions_view.title')} />
          )}
          {hasOrders && (
            <RampOrdersList
              tabLabel={strings('fiat_on_ramp_aggregator.orders')}
            />
          )}
          {isPerpsEnabled && (
            <PerpsConnectionProvider
              tabLabel={strings('perps.transactions.title')}
            >
              <PerpsTransactionsView />
            </PerpsConnectionProvider>
          )}
        </ScrollableTabView>
      </View>
    </ErrorBoundary>
  );
};

export default ActivityView;
