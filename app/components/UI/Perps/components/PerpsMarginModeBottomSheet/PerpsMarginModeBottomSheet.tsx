import React, { useCallback, useEffect, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { MarginMode } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import CrossMarginIcon from '../../../../../images/perps/margin-mode/cross.svg';
import { PerpsMarginModeBottomSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsSelectionOptionCard from '../PerpsSelectionBottomSheet/PerpsSelectionOptionCard';

interface PerpsMarginModeBottomSheetProps {
  isVisible?: boolean;
  /** Market pair shown in the title, e.g. `BTC-USDC`. */
  marketLabel?: string;
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
  marketLabel,
  onClose,
  sheetRef: externalSheetRef,
  selectedMarginMode = 'isolated',
  isCrossMarginAvailable = false,
  isMarginModeLocked = false,
  onMarginModeSelect,
}) => {
  const tw = useTailwind();
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
        {marketLabel
          ? strings('perps.margin_mode.title_with_market', {
              market: marketLabel,
            })
          : strings('perps.margin_mode.title')}
      </BottomSheetHeader>
      <Box accessibilityRole="radiogroup" gap={2} twClassName="px-4 pb-4">
        <PerpsSelectionOptionCard
          option={{
            id: 'isolated',
            title: strings('perps.margin_mode.isolated_title'),
            description: strings('perps.margin_mode.isolated_description'),
            icon: (
              <Icon
                name={IconName.Refresh}
                size={IconSize.Lg}
                color={IconColor.IconDefault}
              />
            ),
            isDisabled: isIsolatedDisabled,
          }}
          isSelected={isIsolatedSelected}
          onPress={handleIsolatedPress}
          testID={PerpsMarginModeBottomSheetSelectorsIDs.ISOLATED_OPTION}
        />
        <PerpsSelectionOptionCard
          option={{
            id: 'cross',
            title: strings('perps.margin_mode.cross_title'),
            description: strings(
              isCrossMarginAvailable
                ? 'perps.margin_mode.cross_description_available'
                : 'perps.margin_mode.cross_description',
            ),
            icon: (
              <CrossMarginIcon
                width={24}
                height={24}
                color={tw.color('icon-default')}
              />
            ),
            isDisabled: isCrossDisabled,
          }}
          isSelected={!isIsolatedSelected}
          onPress={handleCrossPress}
          testID={PerpsMarginModeBottomSheetSelectorsIDs.CROSS_OPTION}
        />
      </Box>
    </BottomSheet>
  );
};

PerpsMarginModeBottomSheet.displayName = 'PerpsMarginModeBottomSheet';

export default PerpsMarginModeBottomSheet;
