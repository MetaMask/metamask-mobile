import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  ListItemSelect,
} from '@metamask/design-system-react-native';
import type { OrderType } from '@metamask/perps-controller';
import React, { useCallback, useEffect, useRef } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { PerpsOrderTypeBottomSheetSelectorsIDs } from '../../Perps.testIds';

export interface PerpsOrderTypeBottomSheetViewProps {
  isVisible?: boolean;
  onClose: () => void;
  onSelect: (orderType: OrderType) => void;
  currentOrderType?: OrderType;
  title?: string;
  showSelectedIcon?: boolean;
  sheetRef?: React.RefObject<BottomSheetRef | null>;
}

const PerpsOrderTypeBottomSheetView = ({
  isVisible = true,
  onClose,
  onSelect,
  currentOrderType,
  title = strings('perps.order.type.title'),
  showSelectedIcon = false,
  sheetRef: externalSheetRef,
}: PerpsOrderTypeBottomSheetViewProps) => {
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef ?? internalSheetRef;
  const orderTypes = [
    {
      type: 'market',
      title: strings('perps.order.type.market.title'),
      description: strings('perps.order.type.market.description'),
      testID: PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION,
    },
    {
      type: 'limit',
      title: strings('perps.order.type.limit.title'),
      description: strings('perps.order.type.limit.description'),
      testID: PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION,
    },
  ] as const;

  useEffect(() => {
    if (isVisible && !externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, externalSheetRef, sheetRef]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, [sheetRef]);

  const handleSelect = useCallback(
    (orderType: OrderType) => {
      onSelect(orderType);
      handleClose();
    },
    [handleClose, onSelect],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      testID={PerpsOrderTypeBottomSheetSelectorsIDs.CONTAINER}
      goBack={!externalSheetRef ? onClose : undefined}
      onClose={externalSheetRef ? onClose : undefined}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: PerpsOrderTypeBottomSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {title}
      </BottomSheetHeader>
      {orderTypes.map((orderType) => (
        <ListItemSelect
          key={orderType.type}
          title={orderType.title}
          description={orderType.description}
          isSelected={currentOrderType === orderType.type}
          showSelectedIcon={showSelectedIcon}
          onPress={() => handleSelect(orderType.type)}
          testID={orderType.testID}
        />
      ))}
    </BottomSheet>
  );
};

export default PerpsOrderTypeBottomSheetView;
