enum AUTHENTICATION_TYPE {
  BIOMETRIC = 'biometrics',
  PASSCODE = 'device_passcode',
  DEVICE_AUTHENTICATION = 'device_authentication',
  PASSWORD = 'password',
  UNKNOWN = 'unknown',
  /**
   * @deprecated Legacy authentication type used for keychain storage
   */
  REMEMBER_ME = 'remember_me',
}

export default AUTHENTICATION_TYPE;
