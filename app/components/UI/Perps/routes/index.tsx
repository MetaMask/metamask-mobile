import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { PerpsConnectionProvider } from '../providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../providers/PerpsStreamManager';
import PerpsMarketListView from '../Views/PerpsMarketListView/PerpsMarketListView';
import PerpsMarketDetailsView from '../Views/PerpsMarketDetailsView';
import PerpsRedirect from '../Views/PerpsRedirect';
import PerpsPositionsView from '../Views/PerpsPositionsView';
import PerpsWithdrawView from '../Views/PerpsWithdrawView';
import PerpsOrderView from '../Views/PerpsOrderView';
import PerpsClosePositionView from '../Views/PerpsClosePositionView';
import PerpsQuoteExpiredModal from '../components/PerpsQuoteExpiredModal';
import PerpsTutorialCarousel from '../components/PerpsTutorialCarousel';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import PerpsBalanceModal from '../Views/PerpsBalanceModal';
import PerpsGTMModal from '../components/PerpsGTMModal';

const Stack = createStackNavigator();
const ModalStack = createStackNavigator();

const PerpsModalStack = () => (
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
      name={Routes.PERPS.MODALS.BALANCE_MODAL}
      component={PerpsBalanceModal}
    />
    <ModalStack.Screen
      name={Routes.PERPS.MODALS.GTM_MODAL}
      component={PerpsGTMModal}
    />
  </ModalStack.Navigator>
);

const PerpsScreenStack = () => (
  <PerpsConnectionProvider isFullScreen>
    <PerpsStreamProvider>
      <Stack.Navigator initialRouteName={Routes.PERPS.TRADING_VIEW}>
        {/* Redirect to wallet perps tab */}
        <Stack.Screen
          name={Routes.PERPS.TRADING_VIEW}
          component={PerpsRedirect}
          options={{
            title: strings('perps.perps_trading'),
            headerShown: false,
          }}
        />

        <Stack.Screen
          name={Routes.PERPS.MARKETS}
          component={PerpsMarketListView}
          options={{
            title: strings('perps.markets.title'),
            headerShown: false,
            animationEnabled: false,
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

        <Stack.Screen
          name={Routes.PERPS.TUTORIAL}
          component={PerpsTutorialCarousel}
          options={{
            title: 'Tutorial',
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
        />
      </Stack.Navigator>
    </PerpsStreamProvider>
  </PerpsConnectionProvider>
);

// Export the stack wrapped with provider
export default PerpsScreenStack;
export { PerpsModalStack };
