import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useMyProfile } from '../../MyProfileView/hooks';
import ManageProfileTextEditor from '../components/ManageProfileTextEditor';
import { ManageProfileEditorSelectorsIDs } from '../ManageProfileView.testIds';

const ManageProfileSocialsView: React.FC = () => {
  const { profile } = useMyProfile();

  return (
    <ManageProfileTextEditor
      title={strings('social_leaderboard.manage_profile.socials')}
      initialValue={profile?.xHandle ?? ''}
      prefix="X @"
      helperText={strings('social_leaderboard.manage_profile.socials_helper')}
      containerTestID={ManageProfileEditorSelectorsIDs.SOCIALS_CONTAINER}
      headerTestID={ManageProfileEditorSelectorsIDs.SOCIALS_HEADER}
      backTestID={ManageProfileEditorSelectorsIDs.SOCIALS_BACK}
      inputTestID={ManageProfileEditorSelectorsIDs.SOCIALS_INPUT}
      saveTestID={ManageProfileEditorSelectorsIDs.SOCIALS_SAVE}
    />
  );
};

export default ManageProfileSocialsView;
