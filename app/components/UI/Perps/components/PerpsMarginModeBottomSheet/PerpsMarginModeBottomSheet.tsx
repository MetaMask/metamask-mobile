import React, { useCallback, useEffect, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  ListItemSelect,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsMarginModeBottomSheetSelectorsIDs } from '../../Perps.testIds';

interface PerpsMarginModeBottomSheetProps {
  isVisible?: boolean;
  onClose: () => void;
  sheetRef?: React.RefObject<BottomSheetRef | null>;
}

const PerpsMarginModeBottomSheet: React.FC<PerpsMarginModeBottomSheetProps> = ({
  isVisible = true,
  onClose,
  sheetRef: externalSheetRef,
}) => {
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef ?? internalSheetRef;

  useEffect(() => {
    if (isVisible && !externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, externalSheetRef, sheetRef]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, [sheetRef]);

  const handleIsolatedPress = useCallback(() => {
    handleClose();
  }, [handleClose]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      testID={PerpsMarginModeBottomSheetSelectorsIDs.CONTAINER}
      goBack={!externalSheetRef ? onClose : undefined}
      onClose={externalSheetRef ? onClose : undefined}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: PerpsMarginModeBottomSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('perps.margin_mode.title')}
      </BottomSheetHeader>
      <ListItemSelect
        title={strings('perps.margin_mode.isolated_title')}
        description={strings('perps.margin_mode.isolated_description')}
        isSelected
        showSelectedIcon
        onPress={handleIsolatedPress}
        testID={PerpsMarginModeBottomSheetSelectorsIDs.ISOLATED_OPTION}
      />
      <ListItemSelect
        title={strings('perps.margin_mode.cross_title')}
        description={strings('perps.margin_mode.cross_description')}
        isSelected={false}
        showSelectedIcon
        disabled
        twClassName="opacity-50"
        testID={PerpsMarginModeBottomSheetSelectorsIDs.CROSS_OPTION}
      />
    </BottomSheet>
  );
};

PerpsMarginModeBottomSheet.displayName = 'PerpsMarginModeBottomSheet';

export default PerpsMarginModeBottomSheet;
