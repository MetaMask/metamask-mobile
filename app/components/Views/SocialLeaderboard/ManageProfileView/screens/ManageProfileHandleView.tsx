import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useMyProfile } from '../../MyProfileView/hooks';
import ManageProfileTextEditor from '../components/ManageProfileTextEditor';
import { ManageProfileEditorSelectorsIDs } from '../ManageProfileView.testIds';

const ManageProfileHandleView: React.FC = () => {
  const { profile } = useMyProfile();

  return (
    <ManageProfileTextEditor
      title={strings('social_leaderboard.manage_profile.handle')}
      initialValue={profile?.handle ?? ''}
      prefix="@"
      helperText={strings('social_leaderboard.manage_profile.handle_helper')}
      containerTestID={ManageProfileEditorSelectorsIDs.HANDLE_CONTAINER}
      headerTestID={ManageProfileEditorSelectorsIDs.HANDLE_HEADER}
      backTestID={ManageProfileEditorSelectorsIDs.HANDLE_BACK}
      inputTestID={ManageProfileEditorSelectorsIDs.HANDLE_INPUT}
      saveTestID={ManageProfileEditorSelectorsIDs.HANDLE_SAVE}
    />
  );
};

export default ManageProfileHandleView;
