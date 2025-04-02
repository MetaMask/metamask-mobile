import React, { useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
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

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});

const ActivityView = () => {
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const hasOrders = useSelector((state) => getHasOrders(state) || false);
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const tabViewRef = useRef();
  const params = useParams();

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
      <View style={styles.wrapper}>
        <ScrollableTabView
          ref={tabViewRef}
          renderTabBar={renderTabBar}
          locked={!hasOrders}
        >
          {isNonEvmAddress(selectedAddress) ? (
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
