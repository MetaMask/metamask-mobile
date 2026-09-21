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
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import ManageProfileScreenChrome from './ManageProfileScreenChrome';

interface ManageProfileTextEditorProps {
  title: string;
  initialValue: string;
  containerTestID: string;
  headerTestID: string;
  backTestID: string;
  inputTestID: string;
  saveTestID: string;
  helperText?: string;
  prefix?: string;
  multiline?: boolean;
}

const ManageProfileTextEditor: React.FC<ManageProfileTextEditorProps> = ({
  title,
  initialValue,
  containerTestID,
  headerTestID,
  backTestID,
  inputTestID,
  saveTestID,
  helperText,
  prefix,
  multiline = false,
}) => {
  const tw = useTailwind();
  const [value, setValue] = useState(initialValue);

  return (
    <ManageProfileScreenChrome
      title={title}
      testID={containerTestID}
      headerTestID={headerTestID}
      backTestID={backTestID}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw.style('flex-1')}
      >
        <Box twClassName="flex-1 px-4 pt-2" gap={2}>
          {multiline ? (
            <TextArea
              value={value}
              onChangeText={setValue}
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
        </Box>
        <Box twClassName="px-4 pb-8 pt-2">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled
            onPress={() => undefined}
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
