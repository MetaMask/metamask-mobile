import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { PerpsConnectionProvider } from '../providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../providers/PerpsStreamManager';
// import PerpsHomeView from '../Views/PerpsHomeView/PerpsHomeView';
import PerpsMarketDetailsView from '../Views/PerpsMarketDetailsView';
import PerpsMarketListView from '../Views/PerpsMarketListView';
import PerpsRedirect from '../Views/PerpsRedirect';
import PerpsPositionsView from '../Views/PerpsPositionsView';
import PerpsWithdrawView from '../Views/PerpsWithdrawView';
import PerpsOrderView from '../Views/PerpsOrderView';
import PerpsClosePositionView from '../Views/PerpsClosePositionView';
// import PerpsCloseAllPositionsView from '../Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView';
// import PerpsCancelAllOrdersView from '../Views/PerpsCancelAllOrdersView/PerpsCancelAllOrdersView';
import PerpsQuoteExpiredModal from '../components/PerpsQuoteExpiredModal';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import PerpsGTMModal from '../components/PerpsGTMModal';
import PerpsTPSLView from '../Views/PerpsTPSLView/PerpsTPSLView';
import PerpsHeroCardView from '../Views/PerpsHeroCardView';
import PerpsStreamBridge from '../components/PerpsStreamBridge';
import { HIP3DebugView } from '../Debug';

const Stack = createStackNavigator();
const ModalStack = createStackNavigator();

const PerpsModalStack = () => (
  <PerpsConnectionProvider isFullScreen>
    <PerpsStreamProvider>
      <ModalStack.Navigator
        mode="modal"
        screenOptions={{
          headerShown: false,
          cardStyle: {
            backgroundColor: 'transparent',
          },
        }}
      >
        <ModalStack.Screen
          name={Routes.PERPS.MODALS.QUOTE_EXPIRED_MODAL}
          component={PerpsQuoteExpiredModal}
        />
        <ModalStack.Screen
          name={Routes.PERPS.MODALS.GTM_MODAL}
          component={PerpsGTMModal}
        />
        {/* TODO: Replace modals once finalized in follow up PR */}
        {/* <ModalStack.Screen
          name={Routes.PERPS.MODALS.CLOSE_ALL_POSITIONS}
          component={PerpsCloseAllPositionsView}
          options={{
            title: strings('perps.close_all_modal.title'),
          }}
        />
        <ModalStack.Screen
          name={Routes.PERPS.MODALS.CANCEL_ALL_ORDERS}
          component={PerpsCancelAllOrdersView}
          options={{
            title: strings('perps.cancel_all_modal.title'),
          }}
        /> */}
      </ModalStack.Navigator>
    </PerpsStreamProvider>
  </PerpsConnectionProvider>
);

const PerpsScreenStack = () => (
  <PerpsConnectionProvider isFullScreen>
    <PerpsStreamProvider>
      <PerpsStreamBridge />
      <Stack.Navigator initialRouteName={Routes.PERPS.PERPS_TAB}>
        {/* Redirect to wallet perps tab */}
        <Stack.Screen
          name={Routes.PERPS.PERPS_TAB}
          component={PerpsRedirect}
          options={{
            title: strings('perps.perps_trading'),
            headerShown: false,
          }}
        />

        <Stack.Screen
          name={Routes.PERPS.PERPS_HOME}
          // TODO: Replace with PerpsHomeView once finalized in follow up PR
          component={PerpsMarketListView}
          options={{
            title: strings('perps.markets.title'),
            headerShown: false,
            animationEnabled: false,
          }}
        />

        <Stack.Screen
          name={Routes.PERPS.MARKET_LIST}
          component={PerpsMarketListView}
          options={{
            title: strings('perps.home.markets'),
            headerShown: false,
          }}
          initialParams={{
            variant: 'full',
            title: strings('perps.home.markets'),
            showBalanceActions: false,
            showBottomNav: false,
            defaultSearchVisible: false,
          }}
        />

        {/* Withdrawal flow screens */}
        <Stack.Screen
          name={Routes.PERPS.WITHDRAW}
          component={PerpsWithdrawView}
          options={{
            title: strings('perps.withdrawal.title'),
            headerShown: false,
          }}
        />

        <Stack.Screen
          name={Routes.PERPS.MARKET_DETAILS}
          component={PerpsMarketDetailsView}
          options={{
            title: strings('perps.market.details.title'),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name={Routes.PERPS.POSITIONS}
          component={PerpsPositionsView}
          options={{
            title: strings('perps.position.title'),
            headerShown: false,
          }}
        />

        <Stack.Screen
          name={Routes.PERPS.ORDER}
          component={PerpsOrderView}
          options={{
            title: strings('perps.order.title'),
            headerShown: false,
          }}
        />

        <Stack.Screen
          name={Routes.PERPS.CLOSE_POSITION}
          component={PerpsClosePositionView}
          options={{
            title: strings('perps.close_position.title'),
            headerShown: false,
          }}
        />

        {/* Debug tools - only available in development builds */}
        {__DEV__ && (
          <Stack.Screen
            name={Routes.PERPS.HIP3_DEBUG}
            component={HIP3DebugView}
            options={{
              title: 'HIP-3 Debug Tools',
              headerShown: true,
            }}
          />
        )}

        {/* TP/SL View - Regular screen */}
        <Stack.Screen
          name={Routes.PERPS.TPSL}
          component={PerpsTPSLView}
          options={{
            title: strings('perps.tpsl.title'),
            headerShown: false,
          }}
        />

        <Stack.Screen
          name={Routes.PERPS.PNL_HERO_CARD}
          component={PerpsHeroCardView}
          options={{
            title: strings('perps.pnl_hero_card.title'),
            headerShown: false,
          }}
        />

        {/* Modal stack for bottom sheet modals */}
        <Stack.Screen
          name={Routes.PERPS.MODALS.ROOT}
          component={PerpsModalStack}
          options={{
            headerShown: false,
            cardStyle: {
              backgroundColor: 'transparent',
            },
            animationEnabled: false,
          }}
        />

        <Stack.Screen
          name={Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS}
          component={Confirm}
          options={{
            title: '',
          }}
        />
      </Stack.Navigator>
    </PerpsStreamProvider>
  </PerpsConnectionProvider>
);

// Export the stack wrapped with provider
export default PerpsScreenStack;
export { PerpsModalStack };
