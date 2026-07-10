import React, { useRef, useEffect, useCallback, memo } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  ListItemSelect,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type OrderType,
} from '@metamask/perps-controller';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { PerpsOrderTypeBottomSheetSelectorsIDs } from '../../Perps.testIds';

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
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;
  const { track } = usePerpsEventTracking();

  useEffect(() => {
    if (isVisible && !externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, externalSheetRef, sheetRef]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose, sheetRef]);

  const orderTypes = [
    {
      type: 'market' as OrderType,
      title: strings('perps.order.type.market.title'),
      description: strings('perps.order.type.market.description'),
      testID: PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
    },
    {
      type: 'limit' as OrderType,
      title: strings('perps.order.type.limit.title'),
      description: strings('perps.order.type.limit.description'),
      testID: PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
    },
  ];

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
      handleClose();
    },
    [currentOrderType, track, asset, direction, onSelect, handleClose],
  );

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={!externalSheetRef ? onClose : undefined}
      onClose={externalSheetRef ? onClose : undefined}
    >
      <BottomSheetHeader onClose={handleClose}>
        {strings('perps.order.type.title')}
      </BottomSheetHeader>
      {orderTypes.map(({ type, title, description, testID }) => (
        <ListItemSelect
          key={type}
          title={title}
          description={description}
          isSelected={currentOrderType === type}
          showSelectedIcon={false}
          onPress={() => handleSelect(type)}
          testID={testID}
        />
      ))}
    </BottomSheet>
  );
};

PerpsOrderTypeBottomSheet.displayName = 'PerpsOrderTypeBottomSheet';

export default memo(
  PerpsOrderTypeBottomSheet,
  (prevProps, nextProps) =>
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.currentOrderType === nextProps.currentOrderType,
);
