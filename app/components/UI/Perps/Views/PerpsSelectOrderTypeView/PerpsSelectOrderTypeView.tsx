import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { OrderType } from '../../controllers/types';
import PerpsOrderTypeBottomSheet from '../../components/PerpsOrderTypeBottomSheet';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';

interface PerpsSelectOrderTypeViewProps {
  sheetRef?: React.RefObject<BottomSheetRef>;
  currentOrderType?: OrderType;
  asset?: string;
  direction?: 'long' | 'short';
  onSelect?: (type: OrderType) => void;
  onClose?: () => void;
}

const PerpsSelectOrderTypeView: React.FC<PerpsSelectOrderTypeViewProps> = ({
  sheetRef: externalSheetRef,
  currentOrderType,
  asset,
  direction,
  onSelect,
  onClose: onExternalClose,
}) => {
  const navigation = useNavigation();
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;

  const handleSelect = useCallback(
    (type: OrderType) => {
      // Close bottom sheet first, then call onSelect callback
      sheetRef.current?.onCloseBottomSheet(() => {
        onExternalClose?.();
        onSelect?.(type);
      });
    },
    [sheetRef, onExternalClose, onSelect],
  );

  const handleClose = useCallback(() => {
    if (externalSheetRef) {
      sheetRef.current?.onCloseBottomSheet(() => {
        onExternalClose?.();
      });
    } else {
      navigation.goBack();
    }
  }, [navigation, externalSheetRef, sheetRef, onExternalClose]);

  return (
    <PerpsOrderTypeBottomSheet
      onClose={handleClose}
      onSelect={handleSelect}
      currentOrderType={currentOrderType || 'market'}
      asset={asset}
      direction={direction}
      sheetRef={sheetRef}
    />
  );
};

export default PerpsSelectOrderTypeView;
