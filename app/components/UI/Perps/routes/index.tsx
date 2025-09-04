import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { strings } from '../../../../../locales/i18n';
import { PerpsConnectionProvider } from '../providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../providers/PerpsStreamManager';
import PerpsMarketListView from '../Views/PerpsMarketListView/PerpsMarketListView';
import PerpsMarketDetailsView from '../Views/PerpsMarketDetailsView';
import PerpsView from '../Views/PerpsView';
import PerpsPositionsView from '../Views/PerpsPositionsView';
import PerpsWithdrawView from '../Views/PerpsWithdrawView';
import PerpsOrderView from '../Views/PerpsOrderView';
import PerpsClosePositionView from '../Views/PerpsClosePositionView';
import PerpsQuoteExpiredModal from '../components/PerpsQuoteExpiredModal';
import PerpsTutorialCarousel from '../components/PerpsTutorialCarousel';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import PerpsBalanceModal from '../Views/PerpsBalanceModal';
import { RootParamList } from '../../../../util/navigation/types';

const Stack = createStackNavigator<RootParamList>();

const PerpsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: {
        backgroundColor: 'transparent',
      },
      presentation: 'modal',
    }}
  >
    <Stack.Screen
      name={'PerpsQuoteExpiredModal'}
      component={PerpsQuoteExpiredModal}
    />
    <Stack.Screen name={'PerpsBalanceModal'} component={PerpsBalanceModal} />
  </Stack.Navigator>
);

const PerpsScreenStack = () => (
  <PerpsConnectionProvider>
    <PerpsStreamProvider>
      <Stack.Navigator initialRouteName={'PerpsTradingView'}>
        {/* Main trading view with minimal functionality */}
        <Stack.Screen
          name={'PerpsTradingView'}
          component={PerpsView}
          options={{
            title: strings('perps.perps_trading'),
            headerShown: true,
          }}
        />

        <Stack.Screen
          name={'PerpsMarketListView'}
          component={PerpsMarketListView}
          options={{
            title: strings('perps.markets.title'),
            headerShown: false,
          }}
        />

        {/* Withdrawal flow screens */}
        <Stack.Screen
          name={'PerpsWithdraw'}
          component={PerpsWithdrawView}
          options={{
            title: strings('perps.withdrawal.title'),
            headerShown: false,
          }}
        />

        <Stack.Screen
          name={'PerpsMarketDetails'}
          component={PerpsMarketDetailsView}
          options={{
            title: strings('perps.market.details.title'),
            headerShown: false,
          }}
        />
        <Stack.Screen
          name={'PerpsPositions'}
          component={PerpsPositionsView}
          options={{
            title: strings('perps.position.title'),
            headerShown: false,
          }}
        />

        <Stack.Screen
          name={'PerpsOrder'}
          component={PerpsOrderView}
          options={{
            title: strings('perps.order.title'),
            headerShown: false,
          }}
        />

        <Stack.Screen
          name={'PerpsClosePosition'}
          component={PerpsClosePositionView}
          options={{
            title: strings('perps.close_position.title'),
            headerShown: false,
          }}
        />

        <Stack.Screen
          name={'PerpsTutorial'}
          component={PerpsTutorialCarousel}
          options={{
            title: 'Tutorial',
            headerShown: false,
          }}
        />

        {/* Modal stack for bottom sheet modals */}
        <Stack.Screen
          name={'PerpsModals'}
          component={PerpsStack}
          options={{
            headerShown: false,
            cardStyle: {
              backgroundColor: 'transparent',
            },
            animationEnabled: false,
          }}
        />

        <Stack.Screen name={'RedesignedConfirmations'} component={Confirm} />
      </Stack.Navigator>
    </PerpsStreamProvider>
  </PerpsConnectionProvider>
);

// Export the stack wrapped with provider
export default PerpsScreenStack;
export { PerpsStack };
