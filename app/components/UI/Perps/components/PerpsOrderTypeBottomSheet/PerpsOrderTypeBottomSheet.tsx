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

interface PerpsOrderTypeBottomSheetProps {
  isVisible?: boolean;
  onClose: () => void;
  onSelect: (orderType: OrderType) => void;
  currentOrderType?: OrderType;
  asset?: string;
  direction?: 'long' | 'short';
  sheetRef?: React.RefObject<BottomSheetRef | null>;
}

const PerpsOrderTypeBottomSheet: React.FC<PerpsOrderTypeBottomSheetProps> = ({
  isVisible = true,
  onClose,
  onSelect,
  currentOrderType,
  asset = 'BTC',
  direction = 'long',
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
          [PERPS_EVENT_PROPERTY.ORDER_TYPE]:
            type === 'market'
              ? PERPS_EVENT_VALUE.ORDER_TYPE.MARKET
              : PERPS_EVENT_VALUE.ORDER_TYPE.LIMIT,
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
      sheetRef={externalSheetRef}
    />
  );
};

PerpsOrderTypeBottomSheet.displayName = 'PerpsOrderTypeBottomSheet';

export default memo(
  PerpsOrderTypeBottomSheet,
  (prevProps, nextProps) =>
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.currentOrderType === nextProps.currentOrderType,
);
