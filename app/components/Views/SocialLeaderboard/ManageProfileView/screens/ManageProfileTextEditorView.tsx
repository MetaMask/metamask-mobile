import type { FieldValidityResponse } from '@metamask/profile-controller';
import {
  type NavigationProp,
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { strings } from '../../../../../../locales/i18n';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import { useMyProfile } from '../../MyProfileView/hooks';
import ManageProfileTextEditor from '../components/ManageProfileTextEditor';
import {
  getHandleAvailabilityError,
  getHandleLocalRuleError,
} from './handleAvailabilityError';
import { MANAGE_PROFILE_TEXT_EDITOR_FIELD_CONFIG } from './manageProfileTextEditorFields';
import { getProfileSaveError } from './saveProfileError';
import {
  MAX_DISPLAY_NAME_LENGTH,
  normalizeUsername,
} from '../../ProfileOnboarding/profileOnboardingDraft';
import { useProfileController } from '../hooks/useProfileController';
import { useManageProfileAnalytics } from '../../../../../hooks/useManageProfileAnalytics';

const ManageProfileTextEditorView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'ManageProfileTextEditorView'>>();
  const { profile } = useMyProfile();
  const {
    isControllerBacked,
    updateProfile,
    checkUsernameAvailability,
    checkDisplayNameValidity,
  } = useProfileController();
  const trackProfileEdited = useManageProfileAnalytics();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const config = MANAGE_PROFILE_TEXT_EDITOR_FIELD_CONFIG[route.params.field];

  const handleSave = useCallback(
    async (value: string): Promise<void> => {
      if (!isControllerBacked || route.params.field === 'socials') {
        return;
      }

      setIsSaving(true);
      setErrorMessage(null);

      try {
        switch (route.params.field) {
          case 'displayName': {
            const displayName = value.trim();
            if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
              setErrorMessage(
                strings(
                  'social_leaderboard.manage_profile.display_name_too_long',
                  { max: MAX_DISPLAY_NAME_LENGTH },
                ),
              );
              return;
            }
            let validity: FieldValidityResponse;
            try {
              validity = await checkDisplayNameValidity(displayName);
            } catch {
              setErrorMessage(
                strings(
                  'social_leaderboard.manage_profile.display_name_check_error',
                ),
              );
              return;
            }
            if (!validity.valid) {
              setErrorMessage(
                strings(
                  'social_leaderboard.profile_onboarding.display_name_invalid',
                ),
              );
              return;
            }
            await updateProfile({ display_name: displayName });
            break;
          }
          case 'handle': {
            const username = normalizeUsername(value);
            if (username !== profile?.handle) {
              const localRuleError = getHandleLocalRuleError(username);
              if (localRuleError) {
                setErrorMessage(localRuleError);
                return;
              }
              const availability = await checkUsernameAvailability(username);
              const availabilityError =
                getHandleAvailabilityError(availability);
              if (availabilityError) {
                setErrorMessage(availabilityError);
                return;
              }
            }
            await updateProfile({ username });
            break;
          }
          case 'bio':
            await updateProfile({ bio: value.trim() || null });
            break;
        }

        trackProfileEdited();
        navigation.goBack();
      } catch (error) {
        setErrorMessage(
          getProfileSaveError(error, route.params.field) ??
            strings('social_leaderboard.manage_profile.save_error'),
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      checkDisplayNameValidity,
      checkUsernameAvailability,
      isControllerBacked,
      navigation,
      profile?.handle,
      route.params.field,
      trackProfileEdited,
      updateProfile,
    ],
  );

  return (
    <ManageProfileTextEditor
      title={strings(config.titleKey)}
      initialValue={config.getInitialValue(profile)}
      onSave={handleSave}
      isSaveDisabled={!isControllerBacked || route.params.field === 'socials'}
      isSaving={isSaving}
      errorMessage={errorMessage}
      helperText={config.helperKey ? strings(config.helperKey) : undefined}
      prefix={config.prefix}
      multiline={config.multiline}
      maxLength={config.maxLength}
      autoFocus={config.autoFocus}
      containerTestID={config.testIDs.container}
      headerTestID={config.testIDs.header}
      backTestID={config.testIDs.back}
      inputTestID={config.testIDs.input}
      saveTestID={config.testIDs.save}
    />
  );
};

export default ManageProfileTextEditorView;
