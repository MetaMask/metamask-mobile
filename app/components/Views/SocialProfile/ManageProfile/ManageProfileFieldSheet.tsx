import React, { useCallback, useRef, useState } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonsAlignment,
  Label,
  TextArea,
  TextField,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';
import ProfileToggleCard from './ProfileToggleCard';

/** Which form control the sheet renders for the field being edited. */
export const ProfileFieldControl = {
  Text: 'text',
  TextArea: 'textarea',
  Switch: 'switch',
} as const;

export type ProfileFieldControl =
  (typeof ProfileFieldControl)[keyof typeof ProfileFieldControl];

/** A text control carries a string, the switch carries a boolean. */
export type ProfileFieldValue = string | boolean;

interface ManageProfileFieldSheetProps {
  /** Sheet heading. */
  title: string;
  /** Label shown above (or beside, for the switch) the control. */
  label: string;
  control: ProfileFieldControl;
  /** Value the form opens with. */
  initialValue: ProfileFieldValue;
  placeholder?: string;
  /** Caps how many characters the text controls accept. */
  maxLength?: number;
  /** Switch only: describes what the current state means. */
  describeValue?: (isOn: boolean) => string;
  /** Switch only: copy rendered below the card. */
  helperText?: string;
  /**
   * Switch only: commit each toggle immediately and drop the Save button, to
   * match helper copy promising changes apply immediately.
   */
  appliesImmediately?: boolean;
  /**
   * Called with the edited value. For Save-based controls the sheet closes
   * itself afterwards; when `appliesImmediately` it fires on every change.
   */
  onSave: (value: ProfileFieldValue) => void;
  /** Called once the sheet has finished animating out, by either route. */
  onClose: () => void;
}

/**
 * Bottom sheet holding a single-field form. Text edits live in a local draft,
 * so dismissing discards and only Save lifts the value out; a switch marked
 * `appliesImmediately` commits on every toggle instead.
 */
const ManageProfileFieldSheet = ({
  title,
  label,
  control,
  initialValue,
  placeholder,
  maxLength,
  describeValue,
  helperText,
  appliesImmediately = false,
  onSave,
  onClose,
}: ManageProfileFieldSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [draft, setDraft] = useState<ProfileFieldValue>(initialValue);

  const handleDismiss = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleToggle = useCallback(
    (isOn: boolean) => {
      setDraft(isOn);
      if (appliesImmediately) {
        onSave(isOn);
      }
    },
    [appliesImmediately, onSave],
  );

  const handleSave = useCallback(() => {
    onSave(draft);
    // The sheet stays mounted until `goBack` fires, so the close animation runs.
    sheetRef.current?.onCloseBottomSheet();
  }, [draft, onSave]);

  const isSwitch = control === ProfileFieldControl.Switch;
  const textValue = typeof draft === 'string' ? draft : '';

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={onClose}
      testID={ManageProfileSelectorsIDs.FIELD_SHEET}
    >
      <BottomSheetHeader
        onClose={handleDismiss}
        closeButtonProps={{
          testID: ManageProfileSelectorsIDs.FIELD_SHEET_CLOSE,
        }}
      >
        {title}
      </BottomSheetHeader>

      {isSwitch ? (
        <ProfileToggleCard
          label={label}
          description={describeValue?.(draft === true) ?? ''}
          helperText={helperText}
          isOn={draft === true}
          onValueChange={handleToggle}
        />
      ) : (
        <Box twClassName="gap-2 px-4 pb-4">
          <Label>{label}</Label>
          {control === ProfileFieldControl.TextArea ? (
            <TextArea
              value={textValue}
              onChangeText={setDraft}
              placeholder={placeholder}
              maxLength={maxLength}
              autoFocus
              testID={ManageProfileSelectorsIDs.FIELD_SHEET_INPUT}
            />
          ) : (
            <TextField
              value={textValue}
              onChangeText={setDraft}
              placeholder={placeholder}
              autoFocus
              // TextField puts `testID` on the root Box, so target the inner
              // input to match TextArea.
              inputProps={{
                testID: ManageProfileSelectorsIDs.FIELD_SHEET_INPUT,
                maxLength,
              }}
            />
          )}
        </Box>
      )}

      {appliesImmediately ? null : (
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          primaryButtonProps={{
            children: strings('app_settings.manage_profile.save'),
            onPress: handleSave,
            testID: ManageProfileSelectorsIDs.FIELD_SHEET_SAVE,
          }}
        />
      )}
    </BottomSheet>
  );
};

export default ManageProfileFieldSheet;
