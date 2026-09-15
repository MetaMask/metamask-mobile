import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useMyProfile } from '../../MyProfileView/hooks';
import ManageProfileTextEditor from '../components/ManageProfileTextEditor';
import { ManageProfileEditorSelectorsIDs } from '../ManageProfileView.testIds';

const ManageProfileBioView: React.FC = () => {
  const { profile } = useMyProfile();

  return (
    <ManageProfileTextEditor
      title={strings('social_leaderboard.manage_profile.bio')}
      initialValue={profile?.bio ?? ''}
      multiline
      containerTestID={ManageProfileEditorSelectorsIDs.BIO_CONTAINER}
      headerTestID={ManageProfileEditorSelectorsIDs.BIO_HEADER}
      backTestID={ManageProfileEditorSelectorsIDs.BIO_BACK}
      inputTestID={ManageProfileEditorSelectorsIDs.BIO_INPUT}
      saveTestID={ManageProfileEditorSelectorsIDs.BIO_SAVE}
    />
  );
};

export default ManageProfileBioView;
