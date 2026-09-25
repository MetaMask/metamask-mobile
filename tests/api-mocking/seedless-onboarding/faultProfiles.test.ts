import {
  SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE,
  SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE_PHASE,
} from './faultProfiles';

describe('seedless password-change fault profiles', () => {
  it('maps metadata_set_fails_after_sss_ok to LOCAL_STATE_PENDING', () => {
    expect(
      SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE_PHASE[
        SEEDLESS_PASSWORD_CHANGE_FAULT_PROFILE.MetadataSetFailsAfterSssOk
      ],
    ).toBe('LOCAL_STATE_PENDING');
  });
});
