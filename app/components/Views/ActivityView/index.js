import React, { useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { isNonEvmAddress } from '../../../core/Multichain/utils';
import { getHasOrders } from '../../../reducers/fiatOrders';
import { getTransactionsNavbarOptions } from '../../UI/Navbar';
import TransactionsView from '../TransactionsView';
import MultichainTransactionsView from '../MultichainTransactionsView';
import TabBar from '../../Base/TabBar';
import { strings } from '../../../../locales/i18n';
import RampOrdersList from '../../UI/Ramp/Views/OrdersList';
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
import { isTestNet } from '../../../util/networks';
import {
  selectEvmChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../../selectors/networkController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_HEADERBASE_TITLE_TEXTVARIANT } from '../../../component-library/components/HeaderBase/HeaderBase.constants';
import { typography } from '@metamask/design-tokens';
import { useStyles } from '../../hooks/useStyles';
import {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';

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
      borderColor: colors.border.muted,
      borderStyle: 'solid',
      borderWidth: 1,
      marginLeft: 5,
      marginRight: 5,
      maxWidth: '60%',
      borderRadius: 20,
    },
    controlButtonDisabled: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.muted,
      borderStyle: 'solid',
      borderWidth: 1,
      marginLeft: 5,
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
  const currentChainId = useSelector(selectEvmChainId);
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const networkName = useSelector(selectNetworkName);
  const hasOrders = useSelector((state) => getHasOrders(state) || false);
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const tabViewRef = useRef();
  const params = useParams();

  const isTestnetOrNotPopularNetwork =
    isTestNet(currentChainId) || !isPopularNetwork;

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
    navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
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

  const renderTabBar = () => (hasOrders ? <TabBar /> : <View />);

  useFocusEffect(
    useCallback(() => {
      if (hasOrders && params.redirectToOrders) {
        navigation.setParams({ redirectToOrders: false });
        tabViewRef.current?.goToPage(1);
      }
    }, [hasOrders, navigation, params.redirectToOrders]),
  );

  return (
    <ErrorBoundary navigation={navigation} view="ActivityView">
      <View style={[styles.header, { marginTop: insets.top }]}>
        <Text
          style={styles.title}
          variant={DEFAULT_HEADERBASE_TITLE_TEXTVARIANT}
        >
          {strings('transactions_view.title')}
        </Text>
      </View>
      <View style={styles.wrapper}>
        <View style={styles.controlButtonOuterWrapper}>
          <ButtonBase
            testID={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
            label={
              <Text numberOfLines={1} style={styles.titleText}>
                {isAllNetworks && isPopularNetwork && isEvmSelected
                  ? strings('wallet.popular_networks')
                  : networkName ?? strings('wallet.current_network')}
              </Text>
            }
            isDisabled={isTestnetOrNotPopularNetwork}
            onPress={isEvmSelected ? showFilterControls : () => null}
            endIconName={isEvmSelected ? IconName.ArrowDown : undefined}
            style={
              isTestNet(currentChainId) || !isPopularNetwork
                ? styles.controlButtonDisabled
                : styles.controlButton
            }
            disabled={isTestNet(currentChainId) || !isPopularNetwork}
          />
        </View>
        <ScrollableTabView
          ref={tabViewRef}
          renderTabBar={renderTabBar}
          locked={!hasOrders}
        >
          {selectedAddress && isNonEvmAddress(selectedAddress) ? (
            <MultichainTransactionsView
              tabLabel={strings('transactions_view.title')}
            />
          ) : (
            <TransactionsView tabLabel={strings('transactions_view.title')} />
          )}
          {hasOrders && (
            <RampOrdersList
              tabLabel={strings('fiat_on_ramp_aggregator.orders')}
            />
          )}
        </ScrollableTabView>
      </View>
    </ErrorBoundary>
  );
};

export default ActivityView;
