export enum AUTHENTICATION_TYPE {
  BIOMETRIC = 'biometrics',
  PASSCODE = 'device_passcode',
  REMEMBER_ME = 'remember_me',
  PASSWORD = 'password',
  UNKNOWN = 'unknown',
}

export enum STORAGE_TYPE {
  ASYNC_STORAGE = 'AsyncStorage',
  FILE_SYSTEM_STORAGE = 'FilesystemStorage',
  UNKNOWN = 'unknown',
}
