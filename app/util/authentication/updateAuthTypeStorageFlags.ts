import AsyncStorage from '@react-native-async-storage/async-storage';
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
    await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
  } else {
    await AsyncStorage.removeItem(BIOMETRY_CHOICE_DISABLED);
    await AsyncStorage.removeItem(PASSCODE_DISABLED);
  }
};
