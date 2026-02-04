import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { useSelector } from 'react-redux';
import type { PerpsNavigationParamList } from '../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { IconName } from '@metamask/design-system-react-native';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import BasicFunctionalityEmptyState from '../../../UI/BasicFunctionality/BasicFunctionalityEmptyState/BasicFunctionalityEmptyState';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { PerpsConnectionProvider } from '../providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../providers/PerpsStreamManager';
import PerpsHomeView from '../Views/PerpsHomeView/PerpsHomeView';
import PerpsMarketDetailsView from '../Views/PerpsMarketDetailsView';
import PerpsMarketListView from '../Views/PerpsMarketListView';
import PerpsRedirect from '../Views/PerpsRedirect';
import PerpsPositionsView from '../Views/PerpsPositionsView';
import PerpsWithdrawView from '../Views/PerpsWithdrawView';
import PerpsClosePositionView from '../Views/PerpsClosePositionView';
import PerpsCloseAllPositionsView from '../Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView';
import PerpsCancelAllOrdersView from '../Views/PerpsCancelAllOrdersView/PerpsCancelAllOrdersView';
import PerpsQuoteExpiredModal from '../components/PerpsQuoteExpiredModal';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import PerpsGTMModal from '../components/PerpsGTMModal';
import PerpsTooltipView from '../Views/PerpsTooltipView/PerpsTooltipView';
import PerpsTPSLView from '../Views/PerpsTPSLView/PerpsTPSLView';
import PerpsAdjustMarginView from '../Views/PerpsAdjustMarginView/PerpsAdjustMarginView';
import PerpsSelectModifyActionView from '../Views/PerpsSelectModifyActionView';
import PerpsSelectAdjustMarginActionView from '../Views/PerpsSelectAdjustMarginActionView';
import PerpsSelectOrderTypeView from '../Views/PerpsSelectOrderTypeView';
import PerpsOrderDetailsView from '../Views/PerpsOrderDetailsView';
import PerpsOrderBookView from '../Views/PerpsOrderBookView';
import PerpsHeroCardView from '../Views/PerpsHeroCardView';
import ActivityView from '../../../Views/ActivityView';
import PerpsStreamBridge from '../components/PerpsStreamBridge';
import { HIP3DebugView } from '../Debug';
import PerpsCrossMarginWarningBottomSheet from '../components/PerpsCrossMarginWarningBottomSheet';
import { useTheme } from '../../../../util/theme';
import { RouteProp, useRoute } from '@react-navigation/native';
import { CONFIRMATION_HEADER_CONFIG } from '../constants/perpsConfig';

const Stack = createStackNavigator<PerpsNavigationParamList>();
const ModalStack = createStackNavigator();

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

function getRedesignedConfirmationsHeaderOptions({
  showPerpsHeader = CONFIRMATION_HEADER_CONFIG.DefaultShowPerpsHeader,
}: PerpsNavigationParamList['RedesignedConfirmations'] = {}) {
  return showPerpsHeader
    ? {
        headerLeft: () => null,
        headerShown: true,
        title: '',
      }
    : { header: () => null };
}

const PerpsConfirmScreen = (
  props: React.ComponentProps<typeof Confirm> & {
    route: RouteProp<PerpsNavigationParamList, 'RedesignedConfirmations'>;
  },
) => {
  const theme = useTheme();
  const params =
    useRoute<RouteProp<PerpsNavigationParamList, 'RedesignedConfirmations'>>();
  const showPerpsHeader =
    params?.params?.showPerpsHeader ??
    CONFIRMATION_HEADER_CONFIG.DefaultShowPerpsHeader;

  return (
    <Confirm
      {...props}
      disableSafeArea={!showPerpsHeader}
      fullscreenStyle={{
        backgroundColor: theme.colors.background.default,
      }}
    />
  );
};

const PerpsModalStack = () => {
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  if (!isBasicFunctionalityEnabled) {
    return (
      <SafeAreaView style={styles.container}>
        <BasicFunctionalityEmptyState
          title={strings('perps.basic_functionality_disabled_title')}
          iconName={IconName.Warning}
        />
      </SafeAreaView>
    );
  }

  return (
    <PerpsConnectionProvider isFullScreen>
      <PerpsStreamProvider>
        <ModalStack.Navigator
          mode="modal"
          screenOptions={{
            headerShown: false,
            cardStyle: {
              backgroundColor: 'transparent',
            },
            cardStyleInterpolator: () => ({
              overlayStyle: {
                opacity: 0,
              },
            }),
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
          <ModalStack.Screen
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
          />
          <ModalStack.Screen
            name={Routes.PERPS.MODALS.CROSS_MARGIN_WARNING}
            component={PerpsCrossMarginWarningBottomSheet}
            options={{
              title: strings('perps.crossMargin.title'),
            }}
          />
          {/* Action Selection Modals */}
          <ModalStack.Screen
            name={Routes.PERPS.SELECT_MODIFY_ACTION}
            component={PerpsSelectModifyActionView}
            options={{
              cardStyle: { backgroundColor: 'transparent' },
            }}
          />
          <ModalStack.Screen
            name={Routes.PERPS.SELECT_ADJUST_MARGIN_ACTION}
            component={PerpsSelectAdjustMarginActionView}
            options={{
              cardStyle: { backgroundColor: 'transparent' },
            }}
          />
          <ModalStack.Screen
            name={Routes.PERPS.SELECT_ORDER_TYPE}
            component={PerpsSelectOrderTypeView}
            options={{
              cardStyle: { backgroundColor: 'transparent' },
            }}
          />
        </ModalStack.Navigator>
      </PerpsStreamProvider>
    </PerpsConnectionProvider>
  );
};

const PerpsClosePositionBottomSheetStack = () => {
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  if (!isBasicFunctionalityEnabled) {
    return (
      <SafeAreaView style={styles.container}>
        <BasicFunctionalityEmptyState
          title={strings('perps.basic_functionality_disabled_title')}
          iconName={IconName.Warning}
        />
      </SafeAreaView>
    );
  }

  return (
    <PerpsConnectionProvider isFullScreen>
      <PerpsStreamProvider>
        <ModalStack.Navigator
          mode="modal"
          screenOptions={{
            headerShown: false,
            cardStyle: {
              backgroundColor: 'transparent',
            },
            cardStyleInterpolator: () => ({
              overlayStyle: {
                opacity: 0,
              },
            }),
          }}
        >
          <ModalStack.Screen
            name={Routes.PERPS.MODALS.TOOLTIP}
            component={PerpsTooltipView}
          />
        </ModalStack.Navigator>
      </PerpsStreamProvider>
    </PerpsConnectionProvider>
  );
};

const PerpsScreenStack = () => {
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  if (!isBasicFunctionalityEnabled) {
    return (
      <SafeAreaView style={styles.container}>
        <BasicFunctionalityEmptyState
          title={strings('perps.basic_functionality_disabled_title')}
          iconName={IconName.Warning}
        />
      </SafeAreaView>
    );
  }

  return (
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
            component={PerpsHomeView}
            options={{
              title: strings('perps.markets.title'),
              headerShown: false,
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

          {/* Adjust Margin View */}
          <Stack.Screen
            name={Routes.PERPS.ADJUST_MARGIN}
            component={PerpsAdjustMarginView}
            options={{
              title: strings('perps.adjust_margin.title'),
              headerShown: false,
            }}
          />

          {/* Order Details View */}
          <Stack.Screen
            name={Routes.PERPS.ORDER_DETAILS}
            component={PerpsOrderDetailsView}
            options={{
              title: strings('perps.order_details.title'),
              headerShown: false,
            }}
          />

          {/* Order Book View */}
          <Stack.Screen
            name={Routes.PERPS.ORDER_BOOK}
            component={PerpsOrderBookView}
            options={{
              title: strings('perps.order_book.title'),
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
          <Stack.Screen
            name={Routes.PERPS.ACTIVITY}
            component={ActivityView}
            options={{
              title: strings('activity_view.title'),
              headerShown: false,
            }}
          />

          {/* Modal stack for ClosePosition bottom sheets (triggered bytooltip) */}
          <Stack.Screen
            name={Routes.PERPS.MODALS.CLOSE_POSITION_MODALS}
            component={PerpsClosePositionBottomSheetStack}
            options={{
              headerShown: false,
              cardStyle: {
                backgroundColor: 'transparent',
              },
              animationEnabled: false,
              // adding detachPreviousScreen to specific screen, rather than to the entire global stack
              detachPreviousScreen: false,
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
            component={PerpsConfirmScreen}
            options={({ route }) =>
              getRedesignedConfirmationsHeaderOptions(route.params)
            }
          />
        </Stack.Navigator>
      </PerpsStreamProvider>
    </PerpsConnectionProvider>
  );
};

// Export the stack wrapped with provider
export default PerpsScreenStack;
export { PerpsClosePositionBottomSheetStack, PerpsModalStack };
