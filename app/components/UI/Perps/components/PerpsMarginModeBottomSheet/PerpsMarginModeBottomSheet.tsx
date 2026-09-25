import React, { useCallback, useEffect, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  ListItemSelect,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import type { MarginMode } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { PerpsMarginModeBottomSheetSelectorsIDs } from '../../Perps.testIds';

interface PerpsMarginModeBottomSheetProps {
  isVisible?: boolean;
  onClose: () => void;
  sheetRef?: React.RefObject<BottomSheetRef | null>;
  /** Mode shown as selected. */
  selectedMode?: MarginMode;
  /** Cross margin is rolled out (drops the "coming soon" copy). */
  isCrossMarginEnabled?: boolean;
  /** Whether the Isolated row can be picked (false when a Cross position fixes the mode). */
  isIsolatedAvailable?: boolean;
  /** Whether the Cross row can be picked (flag on, market allows it, no Isolated position). */
  isCrossAvailable?: boolean;
  /** Called with the picked mode before the sheet closes. */
  onSelect?: (mode: MarginMode) => void;
}

const PerpsMarginModeBottomSheet: React.FC<PerpsMarginModeBottomSheetProps> = ({
  isVisible = true,
  onClose,
  sheetRef: externalSheetRef,
  selectedMode = 'isolated',
  isCrossMarginEnabled = false,
  isIsolatedAvailable = true,
  isCrossAvailable = false,
  onSelect,
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

  const handleSelect = useCallback(
    (mode: MarginMode) => {
      onSelect?.(mode);
      handleClose();
    },
    [onSelect, handleClose],
  );
  const handleIsolatedPress = useCallback(
    () => handleSelect('isolated'),
    [handleSelect],
  );
  const handleCrossPress = useCallback(
    () => handleSelect('cross'),
    [handleSelect],
  );

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
        isSelected={selectedMode === 'isolated'}
        showSelectedIcon={false}
        disabled={!isIsolatedAvailable}
        onPress={isIsolatedAvailable ? handleIsolatedPress : undefined}
        twClassName={isIsolatedAvailable ? undefined : 'opacity-50'}
        testID={PerpsMarginModeBottomSheetSelectorsIDs.ISOLATED_OPTION}
      />
      <ListItemSelect
        title={strings('perps.margin_mode.cross_title')}
        description={strings(
          isCrossMarginEnabled
            ? 'perps.margin_mode.cross_description_enabled'
            : 'perps.margin_mode.cross_description',
        )}
        isSelected={selectedMode === 'cross'}
        showSelectedIcon={false}
        disabled={!isCrossAvailable}
        onPress={isCrossAvailable ? handleCrossPress : undefined}
        twClassName={isCrossAvailable ? undefined : 'opacity-50'}
        testID={PerpsMarginModeBottomSheetSelectorsIDs.CROSS_OPTION}
      />
    </BottomSheet>
  );
};

PerpsMarginModeBottomSheet.displayName = 'PerpsMarginModeBottomSheet';

export default PerpsMarginModeBottomSheet;
