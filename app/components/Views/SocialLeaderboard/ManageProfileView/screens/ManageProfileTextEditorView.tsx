import { type RouteProp, useRoute } from '@react-navigation/native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import { useMyProfile } from '../../MyProfileView/hooks';
import ManageProfileTextEditor from '../components/ManageProfileTextEditor';
import { MANAGE_PROFILE_TEXT_EDITOR_FIELD_CONFIG } from './manageProfileTextEditorFields';

const ManageProfileTextEditorView: React.FC = () => {
  const route =
    useRoute<RouteProp<RootStackParamList, 'ManageProfileTextEditorView'>>();
  const { profile } = useMyProfile();
  const config = MANAGE_PROFILE_TEXT_EDITOR_FIELD_CONFIG[route.params.field];

  return (
    <ManageProfileTextEditor
      title={strings(config.titleKey)}
      initialValue={config.getInitialValue(profile)}
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
