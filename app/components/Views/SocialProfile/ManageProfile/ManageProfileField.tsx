import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Label,
  Text,
  TextArea,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import Routes from '../../../../constants/navigation/Routes';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { PROFILE_FIELD_MAX_LENGTH } from './ManageProfile.constants';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';
import { ManageProfileFieldName } from './ManageProfileField.types';

const ManageProfileField = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ManageProfileField'>>();
  const { field, initialValue } = route.params;
  const [draft, setDraft] = useState(initialValue);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleChangeText = useCallback(
    (value: string) => {
      setDraft(
        field === ManageProfileFieldName.Bio
          ? value.slice(0, PROFILE_FIELD_MAX_LENGTH.bio)
          : value,
      );
    },
    [field],
  );

  const handleSave = useCallback(() => {
    // `navigate` pushes in React Navigation 7. `pop` returns to the Manage
    // profile already on the stack so its in-memory edits stay put.
    navigation.navigate(
      Routes.SOCIAL_PROFILE.MANAGE_PROFILE,
      {
        fieldUpdate: { field, value: draft },
      },
      { pop: true },
    );
  }, [draft, field, navigation]);

  const title =
    field === ManageProfileFieldName.Bio
      ? strings('manage_profile.bio')
      : strings('manage_profile.display_name');

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={ManageProfileSelectorsIDs.FIELD_SCREEN}
    >
      <HeaderStandard
        title={title}
        onBack={handleBack}
        includesTopInset
        testID={ManageProfileSelectorsIDs.FIELD_HEADER}
        backButtonProps={{
          testID: CommonSelectorsIDs.BACK_ARROW_BUTTON,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw.style('flex-1')}
      >
        <Box twClassName="flex-1">
          <Box twClassName="gap-2 px-4 pt-2">
            <Label>{title}</Label>
            {field === ManageProfileFieldName.Bio ? (
              <>
                <TextArea
                  value={draft}
                  onChangeText={handleChangeText}
                  placeholder={strings('manage_profile.bio_placeholder')}
                  maxLength={PROFILE_FIELD_MAX_LENGTH.bio}
                  autoFocus
                  testID={ManageProfileSelectorsIDs.FIELD_INPUT}
                />
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    testID={ManageProfileSelectorsIDs.BIO_HELPER}
                  >
                    {strings('manage_profile.bio_helper')}
                  </Text>
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    testID={ManageProfileSelectorsIDs.BIO_CHARACTER_COUNT}
                  >
                    {strings('manage_profile.bio_character_count', {
                      count: draft.length,
                      limit: PROFILE_FIELD_MAX_LENGTH.bio,
                    })}
                  </Text>
                </Box>
              </>
            ) : (
              <TextField
                value={draft}
                onChangeText={handleChangeText}
                placeholder={strings('manage_profile.display_name_placeholder')}
                autoFocus
                // TextField puts `testID` on the root Box, so target the inner
                // input to match TextArea.
                inputProps={{
                  testID: ManageProfileSelectorsIDs.FIELD_INPUT,
                  maxLength: PROFILE_FIELD_MAX_LENGTH.displayName,
                }}
              />
            )}
          </Box>
        </Box>
        <Box twClassName="px-4 pb-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleSave}
            testID={ManageProfileSelectorsIDs.FIELD_SAVE}
          >
            {strings('manage_profile.save')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ManageProfileField;
