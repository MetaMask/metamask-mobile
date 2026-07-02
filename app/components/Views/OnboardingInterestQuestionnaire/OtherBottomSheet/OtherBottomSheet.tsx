import React, { useCallback, useRef, useState } from 'react';
import { Platform, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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

const OtherBottomSheet = ({
  initialValue = '',
  onClose,
  onDone,
}: OtherBottomSheetProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [draftValue, setDraftValue] = useState(initialValue);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const trimmedDraftValue = draftValue.trim();

  const handleDone = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      onDone(trimmedDraftValue);
    });
  }, [onDone, trimmedDraftValue]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      onClose={onClose}
      keyboardAvoidingViewEnabled
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

      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={Platform.OS === 'android' ? 120 : 20}
        contentContainerStyle={tw.style('px-4 pb-6')}
      >
        <TextInput
          value={draftValue}
          onChangeText={setDraftValue}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          autoFocus
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
        <Box twClassName="mt-4">
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
      </KeyboardAwareScrollView>
    </BottomSheet>
  );
};

export default OtherBottomSheet;
