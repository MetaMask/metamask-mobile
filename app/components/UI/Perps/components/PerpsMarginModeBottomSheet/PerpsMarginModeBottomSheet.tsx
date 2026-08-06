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

const marginModes = [
  {
    id: 'isolated' as const,
    titleKey: 'perps.margin_mode.isolated_title',
    descriptionKey: 'perps.margin_mode.isolated_description',
    testID: PerpsMarginModeBottomSheetSelectorsIDs.ISOLATED_OPTION,
    isDisabled: false,
  },
  {
    id: 'cross' as const,
    titleKey: 'perps.margin_mode.cross_title',
    descriptionKey: 'perps.margin_mode.cross_description',
    testID: PerpsMarginModeBottomSheetSelectorsIDs.CROSS_OPTION,
    isDisabled: true,
  },
] as const;

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
      {marginModes.map((mode) => (
        <ListItemSelect
          key={mode.id}
          title={strings(mode.titleKey)}
          description={strings(mode.descriptionKey)}
          isSelected={mode.id === 'isolated'}
          showSelectedIcon
          isDisabled={mode.isDisabled}
          onPress={mode.id === 'isolated' ? handleIsolatedPress : undefined}
          testID={mode.testID}
        />
      ))}
    </BottomSheet>
  );
};

PerpsMarginModeBottomSheet.displayName = 'PerpsMarginModeBottomSheet';

export default PerpsMarginModeBottomSheet;
