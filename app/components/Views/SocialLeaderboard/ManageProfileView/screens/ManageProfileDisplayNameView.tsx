import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useMyProfile } from '../../MyProfileView/hooks';
import ManageProfileTextEditor from '../components/ManageProfileTextEditor';
import { ManageProfileEditorSelectorsIDs } from '../ManageProfileView.testIds';

const ManageProfileDisplayNameView: React.FC = () => {
  const { profile } = useMyProfile();

  return (
    <ManageProfileTextEditor
      title={strings('social_leaderboard.manage_profile.display_name')}
      initialValue={profile?.displayName ?? ''}
      containerTestID={ManageProfileEditorSelectorsIDs.DISPLAY_NAME_CONTAINER}
      headerTestID={ManageProfileEditorSelectorsIDs.DISPLAY_NAME_HEADER}
      backTestID={ManageProfileEditorSelectorsIDs.DISPLAY_NAME_BACK}
      inputTestID={ManageProfileEditorSelectorsIDs.DISPLAY_NAME_INPUT}
      saveTestID={ManageProfileEditorSelectorsIDs.DISPLAY_NAME_SAVE}
    />
  );
};

export default ManageProfileDisplayNameView;
