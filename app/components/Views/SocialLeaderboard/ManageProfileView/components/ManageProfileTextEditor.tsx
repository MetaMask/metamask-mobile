import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextArea,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  type NavigationAction,
  useNavigation,
  usePreventRemove,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import { useKeyboardHeight } from '../../../../hooks/useKeyboardHeight/useKeyboardHeight';
import ManageProfileScreenChrome from './ManageProfileScreenChrome';

interface ManageProfileTextEditorProps {
  title: string;
  initialValue: string;
  onSave: (value: string) => Promise<boolean>;
  isSaveDisabled?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  containerTestID: string;
  headerTestID: string;
  backTestID: string;
  inputTestID: string;
  saveTestID: string;
  helperText?: string;
  prefix?: string;
  multiline?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
}

const ManageProfileTextEditor: React.FC<ManageProfileTextEditorProps> = ({
  title,
  initialValue,
  onSave,
  isSaveDisabled = false,
  isSaving = false,
  errorMessage,
  containerTestID,
  headerTestID,
  backTestID,
  inputTestID,
  saveTestID,
  helperText,
  prefix,
  multiline = false,
  maxLength,
  autoFocus = false,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [isLeaving, setIsLeaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<NavigationAction | null>(
    null,
  );
  const isConfirmOpenRef = useRef(false);
  const hasDispatchedLeaveRef = useRef(false);

  const hasUnsavedChanges = !isSaveDisabled && value !== savedValue;
  const shouldPreventRemove = (hasUnsavedChanges || isSaving) && !isLeaving;

  usePreventRemove(shouldPreventRemove, ({ data }) => {
    if (isSaving || isConfirmOpenRef.current) {
      return;
    }

    isConfirmOpenRef.current = true;
    Alert.alert(
      strings('social_leaderboard.manage_profile.discard_changes_title'),
      strings('social_leaderboard.manage_profile.discard_changes_message'),
      [
        {
          text: strings('navigation.cancel'),
          style: 'cancel',
          onPress: () => {
            isConfirmOpenRef.current = false;
          },
        },
        {
          text: strings('social_leaderboard.manage_profile.discard'),
          style: 'destructive',
          onPress: () => {
            isConfirmOpenRef.current = false;
            setPendingAction(data.action);
            setIsLeaving(true);
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          isConfirmOpenRef.current = false;
        },
      },
    );
  });

  // Wait a render before navigating so usePreventRemove disarms first.
  useEffect(() => {
    if (!isLeaving || hasDispatchedLeaveRef.current) {
      return;
    }
    hasDispatchedLeaveRef.current = true;
    if (pendingAction) {
      navigation.dispatch(pendingAction);
    } else {
      navigation.goBack();
    }
  }, [isLeaving, navigation, pendingAction]);

  const handleSavePress = useCallback(async () => {
    const didSave = await onSave(value);
    if (didSave) {
      setSavedValue(value);
      setIsLeaving(true);
    }
  }, [onSave, value]);

  const baseBottomPadding = Number(tw.style('pb-4').paddingBottom ?? 16);
  // iOS KeyboardAvoidingView already lifts this row; Android edge-to-edge
  // doesn't resize the window, so the row clears the keyboard or nav bar itself.
  const saveRowPaddingBottom =
    Platform.OS === 'android' && keyboardHeight > 0
      ? keyboardHeight + baseBottomPadding
      : insets.bottom + baseBottomPadding;

  return (
    <ManageProfileScreenChrome
      title={title}
      testID={containerTestID}
      headerTestID={headerTestID}
      backTestID={backTestID}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -insets.bottom : 0}
        style={tw.style('flex-1')}
      >
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('px-4 pt-2 pb-2')}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          showsVerticalScrollIndicator={false}
        >
          <Box gap={2}>
            {multiline ? (
              <TextArea
                value={value}
                onChangeText={setValue}
                maxLength={maxLength}
                autoFocus={autoFocus}
                testID={inputTestID}
              />
            ) : (
              <Box
                flexDirection={BoxFlexDirection.Row}
                twClassName="items-center"
                gap={2}
              >
                {prefix ? (
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {prefix}
                  </Text>
                ) : null}
                <Box twClassName="flex-1">
                  <TextField
                    value={value}
                    onChangeText={setValue}
                    // TextField puts the rest of its props on the root Box, so
                    // the cap has to reach the inner input through `inputProps`.
                    inputProps={{ maxLength }}
                    autoFocus={autoFocus}
                    testID={inputTestID}
                  />
                </Box>
              </Box>
            )}
            {helperText ? (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {helperText}
              </Text>
            ) : null}
            {errorMessage ? (
              <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
                {errorMessage}
              </Text>
            ) : null}
          </Box>
        </ScrollView>
        <Box
          twClassName="px-4 pt-2"
          style={{ paddingBottom: saveRowPaddingBottom }}
        >
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={isSaveDisabled || isSaving || isLeaving}
            isLoading={isSaving}
            onPress={() => {
              handleSavePress().catch(() => undefined);
            }}
            testID={saveTestID}
          >
            {strings('social_leaderboard.manage_profile.save')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </ManageProfileScreenChrome>
  );
};

export default ManageProfileTextEditor;
