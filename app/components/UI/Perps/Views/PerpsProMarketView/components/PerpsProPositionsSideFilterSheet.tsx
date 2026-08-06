import {
  BottomSheet,
  BottomSheetHeader,
  ListItemSelect,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { Modal, View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import ProPositionSideFilterIcon from './ProPositionSideFilterIcon';
import {
  PRO_POSITION_SIDE_FILTER_OPTIONS,
  type ProPositionSideFilter,
} from '../utils/proPositionSideFilter';

export interface PerpsProPositionsSideFilterSheetProps {
  isVisible: boolean;
  sideFilter: ProPositionSideFilter;
  onApply: (next: ProPositionSideFilter) => void;
  onClose: () => void;
  testID?: string;
}

/**
 * Bottom sheet for filtering Pro positions by all sides, long, or short.
 * Applies immediately on selection — no separate Apply button.
 */
const PerpsProPositionsSideFilterSheet = ({
  isVisible,
  sideFilter,
  onApply,
  onClose,
  testID = 'perps-pro-positions-side-filter-sheet',
}: PerpsProPositionsSideFilterSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const handleSelect = useCallback(
    (option: ProPositionSideFilter) => {
      onApply(option);
      handleClose();
    },
    [onApply, handleClose],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <View>
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <BottomSheet ref={sheetRef} onClose={onClose} testID={testID}>
          <BottomSheetHeader
            onClose={handleClose}
            closeButtonProps={{ testID: `${testID}-close` }}
          >
            {strings('perps.market_type.filter_by')}
          </BottomSheetHeader>
          {PRO_POSITION_SIDE_FILTER_OPTIONS.map((option) => {
            const isSelected = sideFilter === option.id;

            return (
              <ListItemSelect
                key={option.id}
                title={strings(option.labelKey)}
                isSelected={isSelected}
                showSelectedIcon
                startAccessory={
                  <ProPositionSideFilterIcon sideFilter={option.id} />
                }
                onPress={() => handleSelect(option.id)}
                testID={`${testID}-option-${option.id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              />
            );
          })}
        </BottomSheet>
      </Modal>
    </View>
  );
};

export default PerpsProPositionsSideFilterSheet;
