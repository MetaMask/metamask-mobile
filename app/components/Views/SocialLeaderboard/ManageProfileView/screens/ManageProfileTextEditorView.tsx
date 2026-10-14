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
import { MANAGE_PROFILE_TEXT_EDITOR_FIELD_CONFIG } from './manageProfileTextEditorFields';
import { normalizeUsername } from '../../ProfileOnboarding/profileOnboardingDraft';
import { useProfileController } from '../hooks/useProfileController';

const ManageProfileTextEditorView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'ManageProfileTextEditorView'>>();
  const { profile } = useMyProfile();
  const { isControllerBacked, updateProfile, checkUsernameAvailability } =
    useProfileController();
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
          case 'displayName':
            await updateProfile({ display_name: value.trim() });
            break;
          case 'handle': {
            const username = normalizeUsername(value);
            if (username !== profile?.handle) {
              const availability = await checkUsernameAvailability(username);
              if (!availability.available || !availability.valid) {
                setErrorMessage(
                  strings(
                    'social_leaderboard.manage_profile.username_unavailable',
                  ),
                );
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

        navigation.goBack();
      } catch {
        setErrorMessage(
          strings('social_leaderboard.manage_profile.save_error'),
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      checkUsernameAvailability,
      isControllerBacked,
      navigation,
      profile?.handle,
      route.params.field,
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
      containerTestID={config.testIDs.container}
      headerTestID={config.testIDs.header}
      backTestID={config.testIDs.back}
      inputTestID={config.testIDs.input}
      saveTestID={config.testIDs.save}
    />
  );
};

export default ManageProfileTextEditorView;
