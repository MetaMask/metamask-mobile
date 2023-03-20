import { MMKVStorage } from '../../core/Storage';
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
    await MMKVStorage.set(BIOMETRY_CHOICE_DISABLED, TRUE);
    await MMKVStorage.set(PASSCODE_DISABLED, TRUE);
  } else {
    await AsyncStorage.removeItem(BIOMETRY_CHOICE_DISABLED);
    await AsyncStorage.removeItem(PASSCODE_DISABLED);
  }
};
