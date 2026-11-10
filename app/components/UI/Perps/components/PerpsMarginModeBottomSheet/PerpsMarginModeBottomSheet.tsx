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
  selectedMarginMode?: MarginMode;
  /** Cross is selectable only when the flag, provider, and market allow it. */
  isCrossMarginAvailable?: boolean;
  /** An open position, resting order or TWAP fixes the market's margin mode. */
  isMarginModeLocked?: boolean;
  onMarginModeSelect?: (marginMode: MarginMode) => void;
}

const PerpsMarginModeBottomSheet: React.FC<PerpsMarginModeBottomSheetProps> = ({
  isVisible = true,
  onClose,
  sheetRef: externalSheetRef,
  selectedMarginMode = 'isolated',
  isCrossMarginAvailable = false,
  isMarginModeLocked = false,
  onMarginModeSelect,
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
    onMarginModeSelect?.('isolated');
    handleClose();
  }, [handleClose, onMarginModeSelect]);

  const handleCrossPress = useCallback(() => {
    onMarginModeSelect?.('cross');
    handleClose();
  }, [handleClose, onMarginModeSelect]);

  const isIsolatedSelected = selectedMarginMode === 'isolated';
  const isIsolatedDisabled = isMarginModeLocked && !isIsolatedSelected;
  const isCrossDisabled =
    !isCrossMarginAvailable || (isMarginModeLocked && isIsolatedSelected);

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
        isSelected={isIsolatedSelected}
        showSelectedIcon={false}
        onPress={isIsolatedDisabled ? undefined : handleIsolatedPress}
        disabled={isIsolatedDisabled}
        twClassName={isIsolatedDisabled ? 'opacity-50' : undefined}
        testID={PerpsMarginModeBottomSheetSelectorsIDs.ISOLATED_OPTION}
      />
      <ListItemSelect
        title={strings('perps.margin_mode.cross_title')}
        description={strings(
          isCrossMarginAvailable
            ? 'perps.margin_mode.cross_description_available'
            : 'perps.margin_mode.cross_description',
        )}
        isSelected={!isIsolatedSelected}
        showSelectedIcon={false}
        onPress={isCrossDisabled ? undefined : handleCrossPress}
        disabled={isCrossDisabled}
        twClassName={isCrossDisabled ? 'opacity-50' : undefined}
        testID={PerpsMarginModeBottomSheetSelectorsIDs.CROSS_OPTION}
      />
    </BottomSheet>
  );
};

PerpsMarginModeBottomSheet.displayName = 'PerpsMarginModeBottomSheet';

export default PerpsMarginModeBottomSheet;
