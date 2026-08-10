import type { BottomSheetRef } from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type Order,
  type Position,
  type TPSLTrackingData,
} from '@metamask/perps-controller';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import PerpsProPositionsModalPortal from '../Views/PerpsProMarketView/components/PerpsProPositionsModalPortal';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { useComplianceGate } from '../../Compliance';
import PerpsBottomSheetTooltip from '../components/PerpsBottomSheetTooltip';
import PerpsFlipPositionConfirmSheet from '../components/PerpsFlipPositionConfirmSheet/PerpsFlipPositionConfirmSheet';
import { selectPerpsEligibility } from '../selectors/perpsController';
import { toPerpsEntryAttribution } from '../utils/perpsAnalyticsAttribution';
import {
  getOrderPositionDirection,
  getValidOrderPrice,
  getValidTriggerPrice,
  isSyntheticOrderCancelable,
} from '../utils/orderUtils';
import PerpsCloseAllPositionsView from '../Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView';
import PerpsSelectAdjustMarginActionView from '../Views/PerpsSelectAdjustMarginActionView/PerpsSelectAdjustMarginActionView';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { usePerpsNavigation } from './usePerpsNavigation';
import { usePerpsProOrderEdit } from './usePerpsProOrderEdit';
import { usePerpsTPSLUpdate } from './usePerpsTPSLUpdate';
import { usePerpsTrading } from './usePerpsTrading';
import usePerpsToasts from './usePerpsToasts';

const PRO_MARKET_SOURCE = PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN;
const PRO_MARKET_BUTTON_LOCATION =
  PERPS_EVENT_VALUE.BUTTON_LOCATION.PERP_MARKET_DETAILS;

const getPositionMarkPrice = (position: Position): string => {
  const absoluteSize = Math.abs(parseFloat(position.size));
  if (absoluteSize <= 0) {
    return '0';
  }

  const markPriceNum = parseFloat(position.positionValue) / absoluteSize;
  return Number.isFinite(markPriceNum) ? markPriceNum.toString() : '0';
};

export interface UsePerpsProPositionsPanelActionsReturn {
  handleClosePosition: (position: Position) => void;
  handleReversePosition: (position: Position) => void;
  handleSharePosition: (position: Position) => void;
  handleEditPositionTpSl: (position: Position) => void;
  handleEditPositionMargin: (position: Position) => void;
  isPositionMarginEditable: (position: Position) => boolean;
  handleCancelOrder: (order: Order) => Promise<void>;
  handleEditOrderPrice: (order: Order) => void;
  handleEditOrderSize: (order: Order) => void;
  handleCloseAllPress: () => void;
  cancelingOrderId: string | null;
  editingOrderId: string | null;
  isOrderCancelable: (order: Order) => boolean;
  isOrderEditable: (order: Order) => boolean;
  isOrderSizeEditable: (order: Order) => boolean;
  renderActionSheets: (filteredPositions?: Position[]) => React.ReactNode;
}

/**
 * Wires Pro positions/orders panel actions to existing Perps flows.
 */
export const usePerpsProPositionsPanelActions =
  (): UsePerpsProPositionsPanelActionsReturn => {
    const navigation = useNavigation<AppNavigationProp>();
    const { navigateToClosePosition } = usePerpsNavigation();
    const isEligible = useSelector(selectPerpsEligibility);
    const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
    const { gate } = useComplianceGate(selectedAddress ?? '');
    const { track } = usePerpsEventTracking();
    const { cancelOrder } = usePerpsTrading();
    const { handleUpdateTPSL } = usePerpsTPSLUpdate();
    const { showToast, PerpsToastOptions } = usePerpsToasts();

    const [showCloseAllSheet, setShowCloseAllSheet] = useState(false);
    const [reversePosition, setReversePosition] = useState<Position | null>(
      null,
    );
    const [adjustMarginPosition, setAdjustMarginPosition] =
      useState<Position | null>(null);
    const [isGeoBlockVisible, setIsGeoBlockVisible] = useState(false);
    const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(
      null,
    );

    const closeAllSheetRef = useRef<BottomSheetRef>(null);
    const reversePositionSheetRef = useRef<BottomSheetRef>(null);
    const adjustMarginSheetRef = useRef<BottomSheetRef>(null);

    const closeGeoBlockModal = useCallback(() => {
      setIsGeoBlockVisible(false);
    }, []);

    const showGeoBlockForSource = useCallback(
      (source: string) => {
        track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
          [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
            PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
          [PERPS_EVENT_PROPERTY.SOURCE]: source,
        });
        setIsGeoBlockVisible(true);
      },
      [track],
    );

    const runGatedEligibleAction = useCallback(
      (source: string, action: () => void | Promise<void>) => {
        gate(async () => {
          if (!isEligible) {
            showGeoBlockForSource(source);
            return;
          }

          await action();
        });
      },
      [gate, isEligible, showGeoBlockForSource],
    );

    const {
      editingOrderId,
      isOrderEditable,
      isOrderSizeEditable,
      handleEditOrderPrice,
      handleEditOrderSize,
      renderOrderEditSheets,
    } = usePerpsProOrderEdit({
      isMutationBlocked: Boolean(cancelingOrderId),
      runGatedEligibleAction,
    });

    const handleCloseAllSheetClose = useCallback(() => {
      setShowCloseAllSheet(false);
    }, []);

    const handleReverseSheetClose = useCallback(() => {
      setReversePosition(null);
    }, []);

    const handleAdjustMarginSheetClose = useCallback(() => {
      setAdjustMarginPosition(null);
    }, []);

    useEffect(() => {
      if (showCloseAllSheet) {
        closeAllSheetRef.current?.onOpenBottomSheet();
      }
    }, [showCloseAllSheet]);

    useEffect(() => {
      if (reversePosition) {
        reversePositionSheetRef.current?.onOpenBottomSheet();
      }
    }, [reversePosition]);

    useEffect(() => {
      if (adjustMarginPosition) {
        adjustMarginSheetRef.current?.onOpenBottomSheet();
      }
    }, [adjustMarginPosition]);

    const handleClosePosition = useCallback(
      (position: Position) => {
        runGatedEligibleAction(
          PERPS_EVENT_VALUE.SOURCE.CLOSE_POSITION_ACTION,
          () =>
            navigateToClosePosition(position, PRO_MARKET_SOURCE, {
              buttonClicked: PERPS_EVENT_VALUE.BUTTON_CLICKED.CLOSE,
              buttonLocation: PRO_MARKET_BUTTON_LOCATION,
            }),
        );
      },
      [navigateToClosePosition, runGatedEligibleAction],
    );

    const handleReversePosition = useCallback(
      (position: Position) => {
        runGatedEligibleAction(
          PERPS_EVENT_VALUE.SOURCE.MODIFY_POSITION_ACTION,
          () => setReversePosition(position),
        );
      },
      [runGatedEligibleAction],
    );

    const handleSharePosition = useCallback(
      (position: Position) => {
        navigation.navigate(Routes.PERPS.PNL_HERO_CARD, {
          position,
          marketPrice: getPositionMarkPrice(position),
        });
      },
      [navigation],
    );

    const handleEditPositionTpSl = useCallback(
      (position: Position) => {
        runGatedEligibleAction(
          PERPS_EVENT_VALUE.SOURCE.AUTO_CLOSE_ACTION,
          () => {
            const markPrice = parseFloat(getPositionMarkPrice(position));
            const currentPrice =
              Number.isFinite(markPrice) && markPrice > 0
                ? markPrice
                : parseFloat(position.entryPrice);

            navigation.navigate(Routes.PERPS.TPSL, {
              asset: position.symbol,
              currentPrice,
              position,
              initialTakeProfitPrice: position.takeProfitPrice,
              initialStopLossPrice: position.stopLossPrice,
              leverage: position.leverage.value,
              onConfirm: async (
                positionFromRoute?: Position,
                takeProfitPrice?: string,
                stopLossPrice?: string,
                trackingData?: TPSLTrackingData,
              ) => {
                const positionToUse = positionFromRoute ?? position;
                return handleUpdateTPSL(
                  positionToUse,
                  takeProfitPrice,
                  stopLossPrice,
                  trackingData,
                );
              },
            });
          },
        );
      },
      [handleUpdateTPSL, navigation, runGatedEligibleAction],
    );

    const isPositionMarginEditable = useCallback(
      (position: Position) => position.leverage.type === 'isolated',
      [],
    );

    const handleEditPositionMargin = useCallback(
      (position: Position) => {
        if (!isPositionMarginEditable(position)) {
          return;
        }

        runGatedEligibleAction(
          PERPS_EVENT_VALUE.SOURCE.ADJUST_MARGIN_ACTION,
          () => setAdjustMarginPosition(position),
        );
      },
      [isPositionMarginEditable, runGatedEligibleAction],
    );

    const isOrderCancelable = useCallback(
      (order: Order) => isSyntheticOrderCancelable(order),
      [],
    );

    const handleCancelOrder = useCallback(
      async (order: Order) => {
        // Mirror openEditSheet: block cancel while another cancel or edit is in flight.
        if (!isOrderCancelable(order) || cancelingOrderId || editingOrderId) {
          return;
        }

        setCancelingOrderId(order.orderId);

        const orderDirection = getOrderPositionDirection(order);
        const effectivePrice =
          getValidOrderPrice(order) ?? getValidTriggerPrice(order);

        showToast(
          PerpsToastOptions.orderManagement.shared.cancellationInProgress(
            orderDirection,
            order.size,
            order.symbol,
            order.orderType,
          ),
        );

        try {
          const result = await cancelOrder({
            orderId: order.orderId,
            symbol: order.symbol,
            trackingData: {
              totalFee: 0,
              marketPrice: effectivePrice ?? 0,
              source: PRO_MARKET_SOURCE,
              ...toPerpsEntryAttribution({
                source: PRO_MARKET_SOURCE,
              }),
            },
          });

          if (result.success) {
            showToast(
              PerpsToastOptions.orderManagement.shared.cancellationSuccess(
                order.reduceOnly,
                order.orderType,
                orderDirection,
                order.size,
                order.symbol,
              ),
            );
          } else {
            showToast(
              PerpsToastOptions.orderManagement.shared.cancellationFailed,
            );
          }
        } catch {
          showToast(
            PerpsToastOptions.orderManagement.shared.cancellationFailed,
          );
        } finally {
          setCancelingOrderId(null);
        }
      },
      [
        PerpsToastOptions,
        cancelOrder,
        cancelingOrderId,
        editingOrderId,
        isOrderCancelable,
        showToast,
      ],
    );

    const handleCloseAllPress = useCallback(() => {
      runGatedEligibleAction(
        PERPS_EVENT_VALUE.SOURCE.CLOSE_ALL_POSITIONS_BUTTON,
        () => setShowCloseAllSheet(true),
      );
    }, [runGatedEligibleAction]);

    const renderActionSheets = useCallback(
      (filteredPositions?: Position[]) => (
        <>
          {showCloseAllSheet && (
            <PerpsProPositionsModalPortal
              onRequestClose={handleCloseAllSheetClose}
            >
              <PerpsCloseAllPositionsView
                sheetRef={closeAllSheetRef}
                onClose={handleCloseAllSheetClose}
                positions={filteredPositions}
              />
            </PerpsProPositionsModalPortal>
          )}

          {reversePosition && (
            <PerpsProPositionsModalPortal
              onRequestClose={handleReverseSheetClose}
            >
              <PerpsFlipPositionConfirmSheet
                position={reversePosition}
                sheetRef={reversePositionSheetRef}
                onClose={handleReverseSheetClose}
                onConfirm={handleReverseSheetClose}
              />
            </PerpsProPositionsModalPortal>
          )}

          {adjustMarginPosition && (
            <PerpsProPositionsModalPortal
              onRequestClose={handleAdjustMarginSheetClose}
            >
              <PerpsSelectAdjustMarginActionView
                sheetRef={adjustMarginSheetRef}
                position={adjustMarginPosition}
                onClose={handleAdjustMarginSheetClose}
              />
            </PerpsProPositionsModalPortal>
          )}

          {renderOrderEditSheets()}

          {isGeoBlockVisible && (
            <PerpsProPositionsModalPortal onRequestClose={closeGeoBlockModal}>
              <PerpsBottomSheetTooltip
                isVisible
                onClose={closeGeoBlockModal}
                contentKey="geo_block"
                testID="perps-pro-positions-panel-geo-block-tooltip"
              />
            </PerpsProPositionsModalPortal>
          )}
        </>
      ),
      [
        adjustMarginPosition,
        closeGeoBlockModal,
        handleAdjustMarginSheetClose,
        handleCloseAllSheetClose,
        handleReverseSheetClose,
        isGeoBlockVisible,
        renderOrderEditSheets,
        reversePosition,
        showCloseAllSheet,
      ],
    );

    return {
      handleClosePosition,
      handleReversePosition,
      handleSharePosition,
      handleEditPositionTpSl,
      handleEditPositionMargin,
      handleCancelOrder,
      handleEditOrderPrice,
      handleEditOrderSize,
      handleCloseAllPress,
      cancelingOrderId,
      editingOrderId,
      isOrderCancelable,
      isOrderEditable,
      isOrderSizeEditable,
      isPositionMarginEditable,
      renderActionSheets,
    };
  };
