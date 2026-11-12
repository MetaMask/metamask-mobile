import React, { useCallback, useRef, useState } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  type BottomSheetRef,
  Box,
  ButtonSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import PerpsSelectionOptionCard from './PerpsSelectionOptionCard';
import { PerpsSelectionBottomSheetSelectorsIDs } from './PerpsSelectionBottomSheet.testIds';
import type { PerpsSelectionBottomSheetProps } from './PerpsSelectionBottomSheet.types';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

/**
 * Bottom sheet that lets the user pick one option from a list of cards and
 * confirm the choice with a save button (e.g. the default exchange).
 *
 * The selection is kept locally until the user saves, so dismissing the sheet
 * discards any change.
 */
const PerpsSelectionBottomSheet: React.FC<PerpsSelectionBottomSheetProps> = ({
  title,
  description,
  options,
  selectedOptionId,
  onSave,
  onClose,
  saveButtonLabel,
  testID = PerpsSelectionBottomSheetSelectorsIDs.CONTAINER,
}) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const sheetRef = useRef<BottomSheetRef>(null);
  const [draftOptionId, setDraftOptionId] = useState(selectedOptionId);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSave = useCallback(() => {
    if (draftOptionId === undefined) {
      return;
    }
    onSave(draftOptionId);
    handleClose();
  }, [draftOptionId, handleClose, onSave]);

  return (
    <BottomSheet ref={sheetRef} goBack={onClose} testID={testID}>
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={handleClose}
        closeButtonProps={{
          accessibilityLabel: strings('navigation.close'),
          testID: PerpsSelectionBottomSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {title}
      </BottomSheetHeaderGlass>
      <Box accessible={false} twClassName="px-4 pb-3" gap={4}>
        {description ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={PerpsSelectionBottomSheetSelectorsIDs.DESCRIPTION}
          >
            {description}
          </Text>
        ) : null}
        <Box accessibilityLabel={title} accessibilityRole="radiogroup" gap={2}>
          {options.map((option) => (
            <PerpsSelectionOptionCard
              key={option.id}
              option={option}
              isSelected={option.id === draftOptionId}
              onPress={() => setDraftOptionId(option.id)}
              testID={`${PerpsSelectionBottomSheetSelectorsIDs.OPTION}-${option.id}`}
            />
          ))}
        </Box>
      </Box>
      <BottomSheetFooter
        twClassName="pt-2"
        primaryButtonProps={{
          children: saveButtonLabel ?? strings('perps.selection_sheet.save'),
          onPress: handleSave,
          size: ButtonSize.Lg,
          isDisabled: draftOptionId === undefined,
          testID: PerpsSelectionBottomSheetSelectorsIDs.SAVE_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

PerpsSelectionBottomSheet.displayName = 'PerpsSelectionBottomSheet';

export default PerpsSelectionBottomSheet;
