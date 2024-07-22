import MMKVWrapper from '../../store/mmkv-wrapper';
import {
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
  TRUE,
} from '../../constants/storage';

// eslint-disable-next-line import/prefer-default-export
export const updateAuthTypeStorageFlags = async (
  newBiometryChoice: boolean,
) => {
  if (!newBiometryChoice) {
    await MMKVWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    await MMKVWrapper.setItem(PASSCODE_DISABLED, TRUE);
  } else {
    await MMKVWrapper.removeItem(BIOMETRY_CHOICE_DISABLED);
    await MMKVWrapper.removeItem(PASSCODE_DISABLED);
  }
};
