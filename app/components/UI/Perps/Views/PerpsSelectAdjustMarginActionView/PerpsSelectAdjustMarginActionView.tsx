import React, { useCallback, useRef } from 'react';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { Position } from '../../controllers/types';
import type { PerpsNavigationParamList } from '../../types/navigation';
import PerpsAdjustMarginActionSheet, {
  type AdjustMarginAction,
} from '../../components/PerpsAdjustMarginActionSheet';
import { usePerpsNavigation } from '../../hooks/usePerpsNavigation';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';

interface PerpsSelectAdjustMarginActionViewProps {
  sheetRef?: React.RefObject<BottomSheetRef>;
  position?: Position;
  onClose?: () => void;
}

const PerpsSelectAdjustMarginActionView: React.FC<
  PerpsSelectAdjustMarginActionViewProps
> = ({
  sheetRef: externalSheetRef,
  position: positionProp,
  onClose: onExternalClose,
}) => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route =
    useRoute<
      RouteProp<PerpsNavigationParamList, 'PerpsSelectAdjustMarginAction'>
    >();

  // Support both props and route params
  const position = positionProp || route.params?.position;
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;
  const { navigateToAdjustMargin } = usePerpsNavigation();

  const handleActionSelect = useCallback(
    (action: AdjustMarginAction) => {
      if (!position) return;

      // Navigate BEFORE closing (prevents navigation loss from component unmounting)
      switch (action) {
        case 'add_margin':
          navigateToAdjustMargin(position, 'add');
          break;
        case 'reduce_margin':
          navigateToAdjustMargin(position, 'remove');
          break;
      }

      // Close bottom sheet AFTER navigation is triggered
      sheetRef.current?.onCloseBottomSheet(() => {
        onExternalClose?.();
      });
    },
    [position, sheetRef, onExternalClose, navigateToAdjustMargin],
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
    <PerpsAdjustMarginActionSheet
      onClose={handleClose}
      onSelectAction={handleActionSelect}
      sheetRef={sheetRef}
    />
  );
};

export default PerpsSelectAdjustMarginActionView;
