import {
  BottomSheetHeader,
  ListItemSelect,
} from '@metamask/design-system-react-native';
import React, { useEffect, useRef } from 'react';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  type BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import {
  LIMIT_ORDER_EXPIRATION_OPTIONS,
  LimitOrdersSelectorsIDs,
  type LimitOrderExpiration,
} from './limitOrders';

interface LimitOrderExpirationBottomSheetProps {
  isVisible: boolean;
  selectedExpiration: LimitOrderExpiration;
  onClose: () => void;
  onSelect: (expiration: LimitOrderExpiration) => void;
}

const LimitOrderExpirationBottomSheet = ({
  isVisible,
  selectedExpiration,
  onClose,
  onSelect,
}: LimitOrderExpirationBottomSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      testID={LimitOrdersSelectorsIDs.EXPIRATION_SHEET}
    >
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        {strings('bridge.limit_order.expiration.title')}
      </BottomSheetHeader>
      {LIMIT_ORDER_EXPIRATION_OPTIONS.map((option) => (
        <ListItemSelect
          key={option.value}
          title={strings(option.labelKey)}
          isSelected={selectedExpiration === option.value}
          onPress={() => {
            sheetRef.current?.onCloseBottomSheet(() => onSelect(option.value));
          }}
          testID={`${LimitOrdersSelectorsIDs.EXPIRATION_SHEET}-${option.value}`}
        />
      ))}
    </BottomSheet>
  );
};

export default LimitOrderExpirationBottomSheet;
