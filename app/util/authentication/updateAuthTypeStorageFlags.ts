import StorageWrapper from '../../store/storage-wrapper';
import {
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
  TRUE,
} from '../../constants/storage';

export const updateAuthTypeStorageFlags = async (
  newBiometryChoice: boolean,
) => {
  if (!newBiometryChoice) {
    await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);
  } else {
    await StorageWrapper.removeItem(BIOMETRY_CHOICE_DISABLED);
    await StorageWrapper.removeItem(PASSCODE_DISABLED);
  }
};
