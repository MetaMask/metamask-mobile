import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, type TextInput } from 'react-native';
import {
  KeyboardProvider,
  useKeyboardState,
  useResizeMode,
} from 'react-native-keyboard-controller';
import {
  Box,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  ButtonSize,
  TextArea,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { OtherBottomSheetTestIds } from './OtherBottomSheet.testIds';

interface OtherBottomSheetProps {
  initialValue?: string;
  onClose: () => void;
  onDone: (value: string) => void;
}

/** Matches design-system bottom sheet open animation duration. */
const SHEET_OPEN_FOCUS_DELAY_MS = 320;

interface OtherBottomSheetContentProps extends OtherBottomSheetProps {
  keyboardAvoidingViewEnabled: boolean;
  keyboardHeight: number;
}

const OtherBottomSheetContent = ({
  initialValue = '',
  onClose,
  onDone,
  keyboardAvoidingViewEnabled,
  keyboardHeight,
}: OtherBottomSheetContentProps) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const inputRef = useRef<TextInput>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftValue, setDraftValue] = useState(initialValue);
  const isAndroid = Platform.OS === 'android';

  const clearFocusTimeout = useCallback(() => {
    if (focusTimeoutRef.current !== null) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
  }, []);

  const focusInputAfterSheetOpens = useCallback(() => {
    clearFocusTimeout();
    focusTimeoutRef.current = setTimeout(() => {
      inputRef.current?.focus();
      focusTimeoutRef.current = null;
    }, SHEET_OPEN_FOCUS_DELAY_MS);
  }, [clearFocusTimeout]);

  useEffect(
    () => () => {
      clearFocusTimeout();
      Keyboard.dismiss();
    },
    [clearFocusTimeout],
  );

  const handleClose = useCallback(() => {
    clearFocusTimeout();
    Keyboard.dismiss();
    bottomSheetRef.current?.onCloseBottomSheet(onClose);
  }, [clearFocusTimeout, onClose]);

  const trimmedDraftValue = draftValue.trim();

  const handleDone = useCallback(() => {
    clearFocusTimeout();
    Keyboard.dismiss();
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      onDone(trimmedDraftValue);
    });
  }, [clearFocusTimeout, onDone, trimmedDraftValue]);

  const bottomSheet = (
    <BottomSheet
      ref={bottomSheetRef}
      onClose={onClose}
      onOpen={focusInputAfterSheetOpens}
      keyboardAvoidingViewEnabled={keyboardAvoidingViewEnabled}
      testID={OtherBottomSheetTestIds.BOTTOM_SHEET}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: `${OtherBottomSheetTestIds.BOTTOM_SHEET}-close-button`,
        }}
      >
        {strings('onboarding_interest_questionnaire.option_other')}
      </BottomSheetHeader>

      <Box paddingHorizontal={4}>
        <TextArea
          ref={inputRef}
          value={draftValue}
          onChangeText={setDraftValue}
          numberOfLines={4}
          placeholder={strings(
            'onboarding_interest_questionnaire.other_placeholder',
          )}
          testID={OtherBottomSheetTestIds.TEXT_INPUT}
          maxLength={100}
        />
      </Box>

      <BottomSheetFooter
        twClassName="mt-4 pb-6"
        primaryButtonProps={{
          children: strings('onboarding_interest_questionnaire.done'),
          size: ButtonSize.Lg,
          onPress: handleDone,
          testID: OtherBottomSheetTestIds.DONE_BUTTON,
        }}
      />
    </BottomSheet>
  );

  if (!isAndroid) {
    return bottomSheet;
  }

  return (
    <Box
      pointerEvents="box-none"
      twClassName="absolute inset-0"
      style={{ transform: [{ translateY: -keyboardHeight }] }}
      testID={OtherBottomSheetTestIds.KEYBOARD_OFFSET_CONTAINER}
    >
      {bottomSheet}
    </Box>
  );
};

const OtherBottomSheetAndroid = (props: OtherBottomSheetProps) => {
  useResizeMode();
  const keyboardHeight = useKeyboardState((state) => state.height);

  return (
    <OtherBottomSheetContent
      {...props}
      keyboardAvoidingViewEnabled={false}
      keyboardHeight={keyboardHeight}
    />
  );
};

const OtherBottomSheet = (props: OtherBottomSheetProps) => {
  if (Platform.OS === 'android') {
    return (
      <KeyboardProvider>
        <OtherBottomSheetAndroid {...props} />
      </KeyboardProvider>
    );
  }

  return (
    <OtherBottomSheetContent
      {...props}
      keyboardAvoidingViewEnabled
      keyboardHeight={0}
    />
  );
};

export default OtherBottomSheet;
