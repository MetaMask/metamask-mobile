import React, { useCallback, memo } from 'react';
import type { BottomSheetRef } from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type OrderType,
} from '@metamask/perps-controller';

import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import PerpsOrderTypeBottomSheetView from './PerpsOrderTypeBottomSheetView';

const ORDER_TYPE_EVENT_VALUES = {
  market: PERPS_EVENT_VALUE.ORDER_TYPE.MARKET,
  limit: PERPS_EVENT_VALUE.ORDER_TYPE.LIMIT,
  stop_market: PERPS_EVENT_VALUE.ORDER_TYPE.STOP_MARKET,
  stop_limit: PERPS_EVENT_VALUE.ORDER_TYPE.STOP_LIMIT,
  take_profit_market: PERPS_EVENT_VALUE.ORDER_TYPE.TAKE_PROFIT_MARKET,
  take_profit_limit: PERPS_EVENT_VALUE.ORDER_TYPE.TAKE_PROFIT_LIMIT,
  twap: PERPS_EVENT_VALUE.ORDER_TYPE.TWAP,
  scale: PERPS_EVENT_VALUE.ORDER_TYPE.SCALE,
  chase: PERPS_EVENT_VALUE.ORDER_TYPE.CHASE,
} satisfies Record<OrderType, string>;

interface PerpsOrderTypeBottomSheetProps {
  isVisible?: boolean;
  onClose: () => void;
  onSelect: (orderType: OrderType) => void;
  currentOrderType?: OrderType;
  asset?: string;
  direction?: 'long' | 'short';
  title?: string;
  showSelectedIcon?: boolean;
  availableOrderTypes?: readonly OrderType[];
  sheetRef?: React.RefObject<BottomSheetRef | null>;
}

const PerpsOrderTypeBottomSheet: React.FC<PerpsOrderTypeBottomSheetProps> = ({
  isVisible = true,
  onClose,
  onSelect,
  currentOrderType,
  asset = 'BTC',
  direction = 'long',
  title,
  showSelectedIcon = false,
  availableOrderTypes,
  sheetRef: externalSheetRef,
}) => {
  const { track } = usePerpsEventTracking();

  const handleSelect = useCallback(
    (type: OrderType) => {
      if (type !== currentOrderType) {
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.ORDER_TYPE_SELECTED,
          [PERPS_EVENT_PROPERTY.ASSET]: asset,
          [PERPS_EVENT_PROPERTY.DIRECTION]:
            direction === 'long'
              ? PERPS_EVENT_VALUE.DIRECTION.LONG
              : PERPS_EVENT_VALUE.DIRECTION.SHORT,
          [PERPS_EVENT_PROPERTY.ORDER_TYPE]: ORDER_TYPE_EVENT_VALUES[type],
        });
      }

      onSelect(type);
    },
    [currentOrderType, track, asset, direction, onSelect],
  );

  return (
    <PerpsOrderTypeBottomSheetView
      isVisible={isVisible}
      onClose={onClose}
      onSelect={handleSelect}
      currentOrderType={currentOrderType}
      title={title}
      showSelectedIcon={showSelectedIcon}
      availableOrderTypes={availableOrderTypes}
      sheetRef={externalSheetRef}
    />
  );
};

PerpsOrderTypeBottomSheet.displayName = 'PerpsOrderTypeBottomSheet';

export default memo(PerpsOrderTypeBottomSheet);
