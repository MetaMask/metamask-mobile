import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type {
  PerpsNavigationParamList,
  PerpsStackParamList,
} from '../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { IconName } from '@metamask/design-system-react-native';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import BasicFunctionalityEmptyState from '../../../UI/BasicFunctionality/BasicFunctionalityEmptyState/BasicFunctionalityEmptyState';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { PerpsConnectionProvider } from '../providers/PerpsConnectionProvider';
import { PerpsGlobalErrorGate } from '../components/PerpsGlobalErrorGate';
import { PerpsStreamProvider } from '../providers/PerpsStreamManager';
import PerpsHomeView from '../Views/PerpsHomeView/PerpsHomeView';
import PerpsMarketDetailsRouter from '../Views/PerpsMarketDetailsRouter';
import PerpsBalanceOrderView from '../Views/PerpsBalanceOrderView';
import PerpsMarketListView from '../Views/PerpsMarketListView';
import PerpsRedirect from '../Views/PerpsRedirect';
import PerpsOrderRedirect from '../Views/PerpsOrderRedirect';
import PerpsPositionsView from '../Views/PerpsPositionsView';
import PerpsWithdrawView from '../Views/PerpsWithdrawView';
import PerpsClosePositionRouter from '../Views/PerpsClosePositionRouter';
import PerpsCloseAllPositionsView from '../Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView';
import PerpsCancelAllOrdersView from '../Views/PerpsCancelAllOrdersView/PerpsCancelAllOrdersView';
import PerpsQuoteExpiredModal from '../components/PerpsQuoteExpiredModal';
import { Confirm } from '../../../Views/confirmations/components/confirm';
import PerpsGTMModal from '../components/PerpsGTMModal';
import PerpsTooltipView from '../Views/PerpsTooltipView/PerpsTooltipView';
import PerpsTPSLRouter from '../Views/PerpsTPSLRouter';
import PerpsAdjustMarginView from '../Views/PerpsAdjustMarginView/PerpsAdjustMarginView';
import PerpsAdjustMarginBottomSheet from '../components/PerpsAdjustMarginBottomSheet';
import PerpsSelectModifyActionView from '../Views/PerpsSelectModifyActionView';
import PerpsSelectAdjustMarginActionView from '../Views/PerpsSelectAdjustMarginActionView';
import PerpsSelectOrderTypeView from '../Views/PerpsSelectOrderTypeView';
import PerpsOrderDetailsView from '../Views/PerpsOrderDetailsView';
import PerpsOrderBookView from '../Views/PerpsOrderBookView';
import PerpsHeroCardView from '../Views/PerpsHeroCardView';
import ActivityScreen from '../../../Views/ActivityScreen';
import PerpsStreamBridge from '../components/PerpsStreamBridge';
import { HIP3DebugView } from '../Debug';
import PerpsCrossMarginWarningBottomSheet from '../components/PerpsCrossMarginWarningBottomSheet';
import PerpsSelectProviderView from '../Views/PerpsSelectProviderView';
import PerpsModeSelectionView from '../Views/PerpsModeSelectionView';
import PerpsOutreachDetailsView from '../Views/PerpsOutreachDetailsView';
import { PayWithModal } from '../../../Views/confirmations/components/modals/pay-with-modal/pay-with-modal';
import { PayWithBottomSheet } from '../../../Views/confirmations/components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectPerpsLastViewedMarketSymbol } from '../selectors/perpsController';
import {
  buildDefaultProMarket,
  useIsPerpsProModeActive,
} from '../utils/perpsModeSwitch';
import { usePerpsScreenVsBottomSheetAbTest } from '../hooks/usePerpsScreenVsBottomSheetAbTest';

/* eslint-disable-next-line */
import { NavigationContext } from '@react-navigation/core';
import { CONFIRMATION_HEADER_CONFIG } from '../constants/perpsConfig';
import {
  clearNativeStackNavigatorOptions,
  transparentModalScreenOptions,
} from '../../../../constants/navigation/clearStackNavigatorOptions';
import { getEmptyNavHeader } from '../../../Views/confirmations/components/UI/navbar/navbar';
import { ConfirmationContextProvider } from '../../../Views/confirmations/context/confirmation-context';
import { AlertsContextProvider } from '../../../Views/confirmations/context/alert-system-context';
import { QRHardwareContextProvider } from '../../../Views/confirmations/context/qr-hardware-context';
import useConfirmationAlerts from '../../../Views/confirmations/hooks/alerts/useConfirmationAlerts';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';
import ConfirmationInfo from '../../../Views/confirmations/components/info-root';

const Stack = createNativeStackNavigator<PerpsStackParamList>();
const ModalStack = createNativeStackNavigator();

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const getPerpsConversionScreenOptions = (
  isBottomSheet: boolean,
  baseOptions: NativeStackNavigationOptions,
): NativeStackNavigationOptions =>
  isBottomSheet
    ? { ...baseOptions, ...transparentModalScreenOptions }
    : baseOptions;

export function getRedesignedConfirmationsHeaderOptions(
  params: PerpsNavigationParamList['RedesignedConfirmations'] = {},
): NativeStackNavigationOptions {
  if (params?.useBottomSheet) {
    return {
      ...transparentModalScreenOptions,
      ...clearNativeStackNavigatorOptions,
      title: '',
      headerBackVisible: false,
    };
  }
  const showPerpsHeader =
    params?.showPerpsHeader ??
    CONFIRMATION_HEADER_CONFIG.DefaultShowPerpsHeader;
  if (showPerpsHeader) {
    return {
      ...getEmptyNavHeader(),
      headerBackVisible: false,
    };
  }
  return {
    headerShown: false,
    title: '',
    headerBackVisible: false,
  };
}

const PerpsConfirmationAlerts = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const alerts = useConfirmationAlerts();

  return (
    <AlertsContextProvider alerts={alerts}>{children}</AlertsContextProvider>
  );
};

export const shouldRenderPerpsConfirmationLoader = (
  useBottomSheet: boolean | undefined,
  approvalRequest: unknown,
) => Boolean(useBottomSheet && !approvalRequest);

/**
 * Back from a Lite market replaces the stack with Perps home
 * (`resetToPerpsHomeTarget`) because the Lite -> Pro switch dropped Home from
 * history. Native stack replaces screens with a push animation by default, so
 * Back slid the market page left as if the user moved forward.
 */
export const getPerpsHomeScreenOptions = (): NativeStackNavigationOptions => ({
  title: strings('perps.markets.title'),
  headerShown: false,
  animationTypeForReplace: 'pop',
});

export const getAdjustMarginOptions = (
  useBottomSheet: boolean | undefined,
): NativeStackNavigationOptions =>
  useBottomSheet
    ? {
        ...clearNativeStackNavigatorOptions,
        ...transparentModalScreenOptions,
        title: '',
      }
    : {
        title: strings('perps.adjust_margin.title'),
        headerShown: false,
      };

export const getTpslOptions = (
  useBottomSheet: boolean | undefined,
): NativeStackNavigationOptions =>
  useBottomSheet
    ? {
        // The sheet draws its own backdrop fade and slide. Leaving the stack
        // animation on would slide the whole transparent screen, backdrop
        // included, which is what separates this from the modify modal.
        ...clearNativeStackNavigatorOptions,
        ...transparentModalScreenOptions,
        title: strings('perps.tpsl.title'),
      }
    : {
        ...transparentModalScreenOptions,
        title: strings('perps.tpsl.title'),
        headerShown: false,
      };

const PerpsConfirmScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { params } =
    useRoute<RouteProp<PerpsNavigationParamList, 'RedesignedConfirmations'>>();
  const { approvalRequest } = useApprovalRequest();
  const showPerpsHeader =
    params?.showPerpsHeader ??
    CONFIRMATION_HEADER_CONFIG.DefaultShowPerpsHeader;

  useEffect(() => {
    if (params?.useBottomSheet) {
      navigation.setOptions({ gestureEnabled: Boolean(approvalRequest) });
    }
  }, [approvalRequest, navigation, params?.useBottomSheet]);

  if (
    shouldRenderPerpsConfirmationLoader(params?.useBottomSheet, approvalRequest)
  ) {
    return <Confirm />;
  }

  if (params?.useBottomSheet) {
    return (
      <ConfirmationContextProvider>
        <PerpsConfirmationAlerts>
          <QRHardwareContextProvider>
            <ConfirmationInfo />
          </QRHardwareContextProvider>
        </PerpsConfirmationAlerts>
      </ConfirmationContextProvider>
    );
  }

  // When showPerpsHeader is false (deposit-and-trade / long-short flow), Confirm internally
  // calls navigation.setOptions({ headerShown: true }) for full-screen confirmations, which
  // would cause the native nav bar to animate in. We intercept setOptions via NavigationContext
  // so headerShown: true is never passed to the native stack, preventing any header animation
  // or reserved header space. This is scoped only to this screen and does not affect Confirm
  // or any other shared component.
  const noHeaderNavigation = useMemo(
    () =>
      Object.assign({}, navigation, {
        setOptions: (options: Parameters<typeof navigation.setOptions>[0]) =>
          navigation.setOptions({ ...options, headerShown: false }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    [navigation],
  );

  if (showPerpsHeader) {
    return <Confirm />;
  }

  return (
    <NavigationContext.Provider value={noHeaderNavigation}>
      <Confirm disableSafeArea />
    </NavigationContext.Provider>
  );
};

export const PerpsAdjustMarginRouter = () => {
  const { params } =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsAdjustMargin'>>();

  if (params?.useBottomSheet && params.position && params.mode) {
    return (
      <PerpsAdjustMarginBottomSheet
        position={params.position}
        initialMode={params.mode}
        enableHaptics={params.enableHaptics}
      />
    );
  }

  return <PerpsAdjustMarginView />;
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
    <PerpsConnectionProvider isFullScreen suppressErrorView>
      <PerpsStreamProvider>
        <ModalStack.Navigator
          screenOptions={{
            ...clearNativeStackNavigatorOptions,
            ...transparentModalScreenOptions,
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
          <ModalStack.Screen
            name={Routes.PERPS.MODALS.SELECT_PROVIDER}
            component={PerpsSelectProviderView}
            options={{
              title: strings('perps.provider_selector.title'),
            }}
          />
          <ModalStack.Screen
            name={Routes.PERPS.MODALS.MODE_SELECTION}
            component={PerpsModeSelectionView}
            options={{
              title: strings('perps.mode.selection_title'),
            }}
          />
          <ModalStack.Screen
            name={Routes.PERPS.MODALS.OUTREACH_DETAILS}
            component={PerpsOutreachDetailsView}
            options={{
              title: strings('perps.outreach_details.title'),
            }}
          />
          {/* Action Selection Modals */}
          <ModalStack.Screen
            name={Routes.PERPS.SELECT_MODIFY_ACTION}
            component={PerpsSelectModifyActionView}
          />
          <ModalStack.Screen
            name={Routes.PERPS.SELECT_ADJUST_MARGIN_ACTION}
            component={PerpsSelectAdjustMarginActionView}
          />
          <ModalStack.Screen
            name={Routes.PERPS.SELECT_ORDER_TYPE}
            component={PerpsSelectOrderTypeView}
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
    <PerpsConnectionProvider isFullScreen suppressErrorView>
      <PerpsStreamProvider>
        <ModalStack.Navigator
          screenOptions={{
            ...clearNativeStackNavigatorOptions,
            ...transparentModalScreenOptions,
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
  // While Pro mode is active, `PerpsHomeView` must never be the landing
  // screen (TAT-3612): default straight to the Pro market instead.
  const isProModeActive = useIsPerpsProModeActive();
  // Shared by every screen-to-bottom-sheet conversion in this navigator.
  const { useBottomSheet: isPerpsBottomSheet } =
    usePerpsScreenVsBottomSheetAbTest({ trackExposure: false });
  const lastViewedMarketSymbol = useSelector(selectPerpsLastViewedMarketSymbol);
  const initialRouteName = isProModeActive
    ? Routes.PERPS.MARKET_DETAILS
    : Routes.PERPS.PERPS_HOME;

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
    <PerpsGlobalErrorGate>
      <PerpsConnectionProvider isFullScreen suppressErrorView>
        <PerpsStreamProvider>
          <PerpsStreamBridge />
          <View style={styles.container}>
            <Stack.Navigator initialRouteName={initialRouteName}>
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
                options={getPerpsHomeScreenOptions}
              />

              <Stack.Screen
                name={Routes.PERPS.MARKET_LIST}
                component={PerpsMarketListView}
                options={({ route }) => ({
                  title: strings('perps.home.markets'),
                  headerShown: false,
                  animation: route.params?.animation ?? 'slide_from_right',
                })}
                initialParams={{
                  variant: 'full',
                  title: strings('perps.home.markets'),
                  showBalanceActions: false,
                  showBottomNav: false,
                }}
              />

              {/* Withdrawal flow screens */}
              <Stack.Screen
                name={Routes.PERPS.BALANCE_ORDER}
                component={PerpsBalanceOrderView}
                options={{ headerShown: false }}
              />
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
                component={PerpsMarketDetailsRouter}
                options={{
                  title: strings('perps.market.details.title'),
                  headerShown: false,
                }}
                initialParams={
                  isProModeActive
                    ? {
                        market: buildDefaultProMarket(lastViewedMarketSymbol),
                      }
                    : undefined
                }
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
                component={PerpsClosePositionRouter}
                options={getPerpsConversionScreenOptions(isPerpsBottomSheet, {
                  title: strings('perps.close_position.title'),
                  headerShown: false,
                })}
              />

              {/* Debug tools - only available in development builds */}
              {__DEV__ && (
                <Stack.Screen
                  name={Routes.PERPS.HIP3_DEBUG}
                  component={HIP3DebugView}
                  options={{
                    title: 'HIP-3 Debug Tools',
                    headerShown: false,
                  }}
                />
              )}

              {/* TP/SL View - Regular screen */}
              <Stack.Screen
                name={Routes.PERPS.TPSL}
                component={PerpsTPSLRouter}
                options={({ route }) =>
                  getTpslOptions(route.params?.useBottomSheet)
                }
              />

              {/* Adjust Margin View */}
              <Stack.Screen
                name={Routes.PERPS.ADJUST_MARGIN}
                component={PerpsAdjustMarginRouter}
                options={({ route }) =>
                  getAdjustMarginOptions(route.params?.useBottomSheet)
                }
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
                component={ActivityScreen}
                options={{
                  title: strings('activity_view.title'),
                  headerShown: false,
                }}
              />

              {/* Modal stack for ClosePosition bottom sheets (triggered by tooltip) */}
              <Stack.Screen
                name={Routes.PERPS.MODALS.CLOSE_POSITION_MODALS}
                component={PerpsClosePositionBottomSheetStack}
                options={{
                  ...clearNativeStackNavigatorOptions,
                  ...transparentModalScreenOptions,
                }}
              />

              {/* Modal stack for bottom sheet modals */}
              <Stack.Screen
                name={Routes.PERPS.MODALS.ROOT}
                component={PerpsModalStack}
                options={{
                  ...clearNativeStackNavigatorOptions,
                  ...transparentModalScreenOptions,
                }}
              />

              {/* Pay-with token selector (lives in App stack for other flows, duplicated here so the
                navigate action is handled inside the native stack instead of being lost
                when dispatched from a transparentModal screen) */}
              <Stack.Screen
                name={Routes.CONFIRMATION_PAY_WITH_MODAL}
                component={PayWithModal}
                options={{
                  headerShown: false,
                  ...clearNativeStackNavigatorOptions,
                  ...transparentModalScreenOptions,
                }}
              />
              <Stack.Screen
                name={Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET}
                component={PayWithBottomSheet}
                options={{
                  ...clearNativeStackNavigatorOptions,
                  ...transparentModalScreenOptions,
                }}
              />

              {/* Order redirect screen - handles one-click trade from token details */}
              <Stack.Screen
                name={Routes.PERPS.ORDER_REDIRECT}
                component={PerpsOrderRedirect}
                options={{
                  headerShown: false,
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
          </View>
        </PerpsStreamProvider>
      </PerpsConnectionProvider>
    </PerpsGlobalErrorGate>
  );
};

const PerpsModalStackWithErrorGate = () => (
  <PerpsGlobalErrorGate>
    <PerpsModalStack />
  </PerpsGlobalErrorGate>
);

// Export the stack wrapped with provider
export default PerpsScreenStack;
export {
  PerpsClosePositionBottomSheetStack,
  PerpsModalStack,
  PerpsModalStackWithErrorGate,
};
