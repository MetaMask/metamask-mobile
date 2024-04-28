import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ENCRYPTION_LIB,
  EXISTING_USER,
  ORIGINAL,
} from '../../constants/storage';

export default async function migrate(state: unknown) {
  const existingUser = await AsyncStorage.getItem(EXISTING_USER);
  const encryptionLib = await AsyncStorage.getItem(ENCRYPTION_LIB);
  if (existingUser && !encryptionLib) {
    await AsyncStorage.setItem(ENCRYPTION_LIB, ORIGINAL);
  }

  return state;
}
