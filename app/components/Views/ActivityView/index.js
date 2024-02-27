import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { getHasOrders } from '../../../reducers/fiatOrders';
import { getTransactionsNavbarOptions } from '../../UI/Navbar';
import TransactionsView from '../TransactionsView';
import TabBar from '../../Base/TabBar';
import { strings } from '../../../../locales/i18n';
import RampOrdersList from '../../UI/Ramp/Views/OrdersList';
import ErrorBoundary from '../ErrorBoundary';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import { selectSelectedAddress } from '../../../selectors/preferencesController';
import { useMetrics } from '../../../components/hooks/useMetrics';

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});

const ActivityView = () => {
  const { colors } = useTheme();
  const { trackEvent } = useMetrics();
  const navigation = useNavigation();
  const selectedAddress = useSelector(selectSelectedAddress);
  const hasOrders = useSelector((state) => getHasOrders(state) || false);
  const accountsByChainId = useSelector(selectAccountsByChainId);

  const openAccountSelector = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ACCOUNT_SELECTOR,
    });
    // Track Event: "Opened Acount Switcher"
    trackEvent(MetaMetricsEvents.BROWSER_OPEN_ACCOUNT_SWITCH, {
      number_of_accounts: Object.keys(accountsByChainId[selectedAddress] ?? {})
        .length,
    });
  }, [navigation, accountsByChainId, selectedAddress, trackEvent]);

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

  return (
    <ErrorBoundary navigation={navigation} view="ActivityView">
      <View style={styles.wrapper}>
        <ScrollableTabView
          renderTabBar={renderTabBar}
          locked={!hasOrders}
          page={!hasOrders ? 0 : undefined}
        >
          <TransactionsView tabLabel={strings('transactions_view.title')} />
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
