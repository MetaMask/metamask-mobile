enum AUTHENTICATION_TYPE {
  DEVICE_AUTHENTICATION = 'device_authentication',
  PASSWORD = 'password',
  UNKNOWN = 'unknown',
  /**
   * @deprecated Legacy authentication type used for keychain storage. Use DEVICE_AUTHENTICATION instead.
   */
  BIOMETRIC = 'biometrics',
  /**
   * @deprecated Legacy authentication type used for keychain storage. Use DEVICE_AUTHENTICATION instead.
   */
  PASSCODE = 'device_passcode',
  /**
   * @deprecated Legacy authentication type used for keychain storage. Use DEVICE_AUTHENTICATION instead.
   */
  REMEMBER_ME = 'remember_me',
}

export default AUTHENTICATION_TYPE;
