import React, { useEffect, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { getHasOrders } from '../../../reducers/fiatOrders';
import getNavbarOptions, { getNetworkNavbarOptions } from '../../UI/Navbar';
import TransactionsView from '../TransactionsView';
import TabBar from '../../Base/TabBar';
import { strings } from '../../../../locales/i18n';
import FiatOrdersView from '../FiatOrdersView';
import ErrorBoundary from '../ErrorBoundary';
import { DrawerContext } from '../../Nav/Main/MainNavigator';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import AnalyticsV2 from '../../../util/analyticsV2';

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});

const ActivityView = () => {
  const { drawerRef } = useContext(DrawerContext);
  const { colors } = useTheme();
  const navigation = useNavigation();
  const selectedAddress = useSelector(
    (state) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const hasOrders = useSelector((state) => getHasOrders(state) || false);
  const accounts = useSelector(
    (state) => state.engine.backgroundState.AccountTrackerController.accounts,
  );

  const openAccountSelector = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ACCOUNT_SELECTOR,
    });
    // Track Event: "Opened Acount Switcher"
    AnalyticsV2.trackEvent(
      AnalyticsV2.ANALYTICS_EVENTS.BROWSER_OPEN_ACCOUNT_SWITCH,
      {
        number_of_accounts: Object.keys(accounts ?? {}).length,
      },
    );
  };

  useEffect(
    () => {
      const title =
        hasOrders ?? false ? 'activity_view.title' : 'transactions_view.title';
      // navigation.setOptions(
      //   getNetworkNavbarOptions(
      //     title,
      //     true,
      //     navigation,
      //     colors,
      //     openAccountSelector,
      //     true,
      //   ),
      // );
      navigation.setOptions(
        getNavbarOptions(
          title,
          false,
          drawerRef,
          colors,
          navigation,
          true,
        ),
      );
    },
    /* eslint-disable-next-line */
    [navigation, hasOrders, colors, selectedAddress, openAccountSelector],
  );

  const renderTabBar = () => (hasOrders ? <TabBar /> : <View />);

  return (
    <ErrorBoundary view="ActivityView">
      <View style={styles.wrapper}>
        <ScrollableTabView
          renderTabBar={renderTabBar}
          locked={!hasOrders}
          page={!hasOrders ? 0 : undefined}
        >
          <TransactionsView tabLabel={strings('transactions_view.title')} />
          {hasOrders && (
            <FiatOrdersView tabLabel={strings('fiat_on_ramp.purchases')} />
          )}
        </ScrollableTabView>
      </View>
    </ErrorBoundary>
  );
};

export default ActivityView;
