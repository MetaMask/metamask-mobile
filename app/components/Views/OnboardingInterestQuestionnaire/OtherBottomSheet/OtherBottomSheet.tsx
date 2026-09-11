import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, TextInput, View } from 'react-native';
import {
  KeyboardProvider,
  useKeyboardState,
  useResizeMode,
} from 'react-native-keyboard-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BottomSheet,
  BottomSheetHeader,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../util/theme';
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
  const tw = useTailwind();
  const { colors } = useTheme();
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
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('onboarding_interest_questionnaire.option_other')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4">
        <TextInput
          ref={inputRef}
          value={draftValue}
          onChangeText={setDraftValue}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholder={strings(
            'onboarding_interest_questionnaire.other_placeholder',
          )}
          placeholderTextColor={colors.text.alternative}
          style={tw.style(
            'min-h-[120px] rounded-xl border border-default bg-background-muted px-4 py-3 text-body-md text-default',
          )}
          testID={OtherBottomSheetTestIds.TEXT_INPUT}
          maxLength={100}
        />
      </Box>

      <Box twClassName="mt-4 px-4 pb-6">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleDone}
          testID={OtherBottomSheetTestIds.DONE_BUTTON}
        >
          {strings('onboarding_interest_questionnaire.done')}
        </Button>
      </Box>
    </BottomSheet>
  );

  if (!isAndroid) {
    return bottomSheet;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFill,
        {
          transform: [{ translateY: -keyboardHeight }],
        },
      ]}
      testID={OtherBottomSheetTestIds.KEYBOARD_OFFSET_CONTAINER}
    >
      {bottomSheet}
    </View>
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
