import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
  ListItemSelect,
} from '@metamask/design-system-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
 */
const PerpsProPositionsSideFilterSheet = ({
  isVisible,
  sideFilter,
  onApply,
  onClose,
  testID = 'perps-pro-positions-side-filter-sheet',
}: PerpsProPositionsSideFilterSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const wasVisibleRef = useRef(false);
  const [draftSideFilter, setDraftSideFilter] =
    useState<ProPositionSideFilter>(sideFilter);

  useEffect(() => {
    const justOpened = isVisible && !wasVisibleRef.current;
    wasVisibleRef.current = isVisible;

    if (!justOpened) {
      return;
    }

    setDraftSideFilter(sideFilter);
    sheetRef.current?.onOpenBottomSheet();
  }, [isVisible, sideFilter]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const handleApply = useCallback(() => {
    onApply(draftSideFilter);
    handleClose();
  }, [draftSideFilter, handleClose, onApply]);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('perps.sort.apply'),
      onPress: handleApply,
      testID: `${testID}-apply`,
    }),
    [handleApply, testID],
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
            const isSelected = draftSideFilter === option.id;

            return (
              <ListItemSelect
                key={option.id}
                title={strings(option.labelKey)}
                isSelected={isSelected}
                showSelectedIcon
                startAccessory={
                  <ProPositionSideFilterIcon sideFilter={option.id} />
                }
                onPress={() => setDraftSideFilter(option.id)}
                testID={`${testID}-option-${option.id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              />
            );
          })}

          <BottomSheetFooter
            primaryButtonProps={primaryButtonProps}
            twClassName="pt-4"
          />
        </BottomSheet>
      </Modal>
    </View>
  );
};

export default PerpsProPositionsSideFilterSheet;
