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
import { Modal, View } from 'react-native';
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
  handleCloseAllPress: () => void;
  cancelingOrderId: string | null;
  isOrderCancelable: (order: Order) => boolean;
  renderActionSheets: () => React.ReactNode;
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
    const [isCloseAllGeoBlockVisible, setIsCloseAllGeoBlockVisible] =
      useState(false);
    const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
      useState(false);
    const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(
      null,
    );

    const closeAllSheetRef = useRef<BottomSheetRef>(null);
    const reversePositionSheetRef = useRef<BottomSheetRef>(null);
    const adjustMarginSheetRef = useRef<BottomSheetRef>(null);

    const closeEligibilityModal = useCallback(() => {
      setIsEligibilityModalVisible(false);
    }, []);

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
        gate(async () => {
          if (!isEligible) {
            track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
              [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
                PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
              [PERPS_EVENT_PROPERTY.SOURCE]:
                PERPS_EVENT_VALUE.SOURCE.CLOSE_POSITION_ACTION,
            });
            setIsEligibilityModalVisible(true);
            return;
          }

          navigateToClosePosition(position, PRO_MARKET_SOURCE, {
            buttonClicked: PERPS_EVENT_VALUE.BUTTON_CLICKED.CLOSE,
            buttonLocation: PRO_MARKET_BUTTON_LOCATION,
          });
        });
      },
      [gate, isEligible, navigateToClosePosition, track],
    );

    const handleReversePosition = useCallback(
      (position: Position) => {
        gate(async () => {
          if (!isEligible) {
            track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
              [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
                PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
              [PERPS_EVENT_PROPERTY.SOURCE]:
                PERPS_EVENT_VALUE.SOURCE.MODIFY_POSITION_ACTION,
            });
            setIsEligibilityModalVisible(true);
            return;
          }

          setReversePosition(position);
        });
      },
      [gate, isEligible, track],
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
        gate(async () => {
          if (!isEligible) {
            track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
              [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
                PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
              [PERPS_EVENT_PROPERTY.SOURCE]:
                PERPS_EVENT_VALUE.SOURCE.AUTO_CLOSE_ACTION,
            });
            setIsEligibilityModalVisible(true);
            return;
          }

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
        });
      },
      [gate, handleUpdateTPSL, isEligible, navigation, track],
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

        gate(async () => {
          if (!isEligible) {
            track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
              [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
                PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
              [PERPS_EVENT_PROPERTY.SOURCE]:
                PERPS_EVENT_VALUE.SOURCE.ADJUST_MARGIN_ACTION,
            });
            setIsEligibilityModalVisible(true);
            return;
          }

          setAdjustMarginPosition(position);
        });
      },
      [gate, isEligible, isPositionMarginEditable, track],
    );

    const isOrderCancelable = useCallback(
      (order: Order) => isSyntheticOrderCancelable(order),
      [],
    );

    const handleCancelOrder = useCallback(
      async (order: Order) => {
        if (!isOrderCancelable(order) || cancelingOrderId) {
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
        isOrderCancelable,
        showToast,
      ],
    );

    const handleCloseAllPress = useCallback(() => {
      gate(async () => {
        if (!isEligible) {
          track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
            [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
              PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
            [PERPS_EVENT_PROPERTY.SOURCE]:
              PERPS_EVENT_VALUE.SOURCE.CLOSE_ALL_POSITIONS_BUTTON,
          });
          setIsCloseAllGeoBlockVisible(true);
          return;
        }

        setShowCloseAllSheet(true);
      });
    }, [gate, isEligible, track]);

    const renderActionSheets = useCallback(
      () => (
        <>
          {showCloseAllSheet && (
            <PerpsCloseAllPositionsView
              sheetRef={closeAllSheetRef}
              onClose={handleCloseAllSheetClose}
            />
          )}

          {reversePosition && (
            <PerpsFlipPositionConfirmSheet
              position={reversePosition}
              sheetRef={reversePositionSheetRef}
              onClose={handleReverseSheetClose}
              onConfirm={handleReverseSheetClose}
            />
          )}

          {adjustMarginPosition && (
            <PerpsSelectAdjustMarginActionView
              sheetRef={adjustMarginSheetRef}
              position={adjustMarginPosition}
              onClose={handleAdjustMarginSheetClose}
            />
          )}

          {isEligibilityModalVisible && (
            <View>
              <Modal
                visible
                transparent
                animationType="none"
                statusBarTranslucent
              >
                <PerpsBottomSheetTooltip
                  isVisible
                  onClose={closeEligibilityModal}
                  contentKey="geo_block"
                  testID="perps-pro-positions-panel-geo-block-tooltip"
                />
              </Modal>
            </View>
          )}

          {isCloseAllGeoBlockVisible && (
            <View>
              <Modal
                visible
                transparent
                animationType="none"
                statusBarTranslucent
              >
                <PerpsBottomSheetTooltip
                  isVisible
                  onClose={() => setIsCloseAllGeoBlockVisible(false)}
                  contentKey="geo_block"
                  testID="perps-pro-positions-panel-close-all-geo-block-tooltip"
                />
              </Modal>
            </View>
          )}
        </>
      ),
      [
        adjustMarginPosition,
        closeEligibilityModal,
        handleAdjustMarginSheetClose,
        handleCloseAllSheetClose,
        handleReverseSheetClose,
        isCloseAllGeoBlockVisible,
        isEligibilityModalVisible,
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
      handleCloseAllPress,
      cancelingOrderId,
      isOrderCancelable,
      isPositionMarginEditable,
      renderActionSheets,
    };
  };
