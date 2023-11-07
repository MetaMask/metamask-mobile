import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
  PASSCODE_DISABLED,
  EXISTING_USER,
} from '../../constants/storage';
import { Authentication } from './Authentication';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
// eslint-disable-next-line import/no-namespace
import * as Keychain from 'react-native-keychain';
import SecureKeychain from '../SecureKeychain';
import configureMockStore from 'redux-mock-store';
import Logger from '../../util/Logger';

describe('Authentication', () => {
  const initialState = {
    security: {
      allowLoginWithRememberMe: true,
    },
  };
  const mockStore = configureMockStore();
  const store = mockStore(initialState);

  beforeEach(() => {
    Authentication.init(store);
  });

  afterEach(() => {
    AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('Does not initialize class more than once', async () => {
    const spy = jest.spyOn(Logger, 'log');
    Authentication.init(store);
    Authentication.init(store);
    expect(spy).toHaveBeenCalledWith(
      'Attempted to call init on AuthenticationService but an instance has already been initialized',
    );
  });

  it('should return a type password', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FACE_ID);
    await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
    const result = await Authentication.getType();
    expect(result.availableBiometryType).toEqual('FaceID');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('should return a type biometric', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FACE_ID);
    const result = await Authentication.getType();
    expect(result.availableBiometryType).toEqual('FaceID');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.BIOMETRIC);
  });

  it('should return a type passcode', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    const result = await Authentication.getType();
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSCODE);
  });

  it('should return a type password with biometric & pincode disabled', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
    const result = await Authentication.getType();
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('should return a type AUTHENTICATION_TYPE.REMEMBER_ME if the user exists and there are no available biometrics options and the password exist in the keychain', async () => {
    SecureKeychain.getSupportedBiometryType = jest.fn().mockReturnValue(null);
    const mockCredentials = { username: 'test', password: 'test' };
    SecureKeychain.getGenericPassword = jest
      .fn()
      .mockReturnValue(mockCredentials);
    await AsyncStorage.setItem(EXISTING_USER, TRUE);
    const result = await Authentication.getType();
    expect(result.availableBiometryType).toBeNull();
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.REMEMBER_ME);
  });

  it('should return a type AUTHENTICATION_TYPE.PASSWORD if the user exists and there are no available biometrics options but the password does not exist in the keychain', async () => {
    SecureKeychain.getSupportedBiometryType = jest.fn().mockReturnValue(null);
    await AsyncStorage.setItem(EXISTING_USER, TRUE);
    const result = await Authentication.getType();
    expect(result.availableBiometryType).toBeNull();
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.REMEMBER_ME);
  });

  it('should return a type AUTHENTICATION_TYPE.PASSWORD if the user  does not exists and there are no available biometrics options', async () => {
    SecureKeychain.getSupportedBiometryType = jest.fn().mockReturnValue(null);
    const mockCredentials = { username: 'test', password: 'test' };
    SecureKeychain.getGenericPassword = jest
      .fn()
      .mockReturnValue(mockCredentials);
    await AsyncStorage.setItem(EXISTING_USER, TRUE);
    const result = await Authentication.getType();
    expect(result.availableBiometryType).toBeNull();
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.REMEMBER_ME);
  });

  it('should return a auth type for components AUTHENTICATION_TYPE.REMEMBER_ME', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    const result = await Authentication.componentAuthenticationType(
      false,
      true,
    );
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.REMEMBER_ME);
  });

  it('should return a auth type for components AUTHENTICATION_TYPE.PASSWORD', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
    const result = await Authentication.componentAuthenticationType(
      false,
      false,
    );
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('should return a auth type for components AUTHENTICATION_TYPE.PASSCODE', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    const result = await Authentication.componentAuthenticationType(
      true,
      false,
    );
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSCODE);
  });

  it('should return a auth type for components AUTHENTICATION_TYPE.BIOMETRIC', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    const result = await Authentication.componentAuthenticationType(
      true,
      false,
    );
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.BIOMETRIC);
  });

  it('should return set a password using PASSWORD', async () => {
    let methodCalled = false;
    SecureKeychain.resetGenericPassword = jest
      .fn()
      .mockReturnValue((methodCalled = true));
    await Authentication.storePassword('1234', AUTHENTICATION_TYPE.UNKNOWN);
    expect(methodCalled).toBeTruthy();
  });
});
