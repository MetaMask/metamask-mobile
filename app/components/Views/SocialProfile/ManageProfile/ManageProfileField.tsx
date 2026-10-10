import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import {
  CommonActions,
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
import {
  ManageProfileFieldName,
  type ManageProfileFieldUpdate,
} from './ManageProfileField.types';
import ProfileToggleCard from './ProfileToggleCard';

const commitFieldUpdate = (
  navigation: AppNavigationProp,
  fieldUpdate: ManageProfileFieldUpdate,
  leaveScreen: boolean,
) => {
  if (leaveScreen) {
    // `navigate` pushes in React Navigation 7. `pop` returns to the Manage
    // profile already on the stack so its in-memory edits stay put.
    navigation.navigate(
      Routes.SOCIAL_PROFILE.MANAGE_PROFILE,
      { fieldUpdate },
      { pop: true },
    );
    return;
  }

  // The profile screen is still underneath. Update its params in place so a
  // switch can commit without popping this screen off the stack.
  const state = navigation.getState();
  const previousRoute = state?.routes[state.index - 1];
  if (!previousRoute) {
    return;
  }

  navigation.dispatch({
    ...CommonActions.setParams({ fieldUpdate }),
    source: previousRoute.key,
  });
};

const ManageProfileField = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ManageProfileField'>>();
  const { field, initialValue } = route.params;
  const [draft, setDraft] = useState(initialValue);
  const isSwitch = field === ManageProfileFieldName.TradingActivity;
  const textValue = typeof draft === 'string' ? draft : '';

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleToggle = useCallback(
    (isOn: boolean) => {
      setDraft(isOn);
      // The footnote says changes apply immediately, so there is no Save.
      commitFieldUpdate(
        navigation,
        { field: ManageProfileFieldName.TradingActivity, value: isOn },
        false,
      );
    },
    [navigation],
  );

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
    if (typeof draft !== 'string') {
      return;
    }
    commitFieldUpdate(navigation, { field, value: draft }, true);
  }, [draft, field, navigation]);

  const title =
    field === ManageProfileFieldName.Bio
      ? strings('manage_profile.bio')
      : field === ManageProfileFieldName.TradingActivity
        ? strings('manage_profile.trading_activity')
        : strings('manage_profile.display_name');

  const label =
    field === ManageProfileFieldName.TradingActivity
      ? strings('manage_profile.show_trading_activity')
      : title;

  const description =
    draft === true
      ? strings('manage_profile.trading_activity_public')
      : strings('manage_profile.trading_activity_private');

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
          {isSwitch ? (
            <ProfileToggleCard
              label={label}
              description={description}
              helperText={strings('manage_profile.trading_activity_footnote')}
              isOn={draft === true}
              onValueChange={handleToggle}
            />
          ) : (
            <Box twClassName="gap-2 px-4 pt-2">
              <Label>{title}</Label>
              {field === ManageProfileFieldName.Bio ? (
                <>
                  <TextArea
                    value={textValue}
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
                        count: textValue.length,
                        limit: PROFILE_FIELD_MAX_LENGTH.bio,
                      })}
                    </Text>
                  </Box>
                </>
              ) : (
                <TextField
                  value={textValue}
                  onChangeText={handleChangeText}
                  placeholder={strings(
                    'manage_profile.display_name_placeholder',
                  )}
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
          )}
        </Box>
        {isSwitch ? null : (
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
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ManageProfileField;
