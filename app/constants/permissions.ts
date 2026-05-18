export enum USER_INTENT {
  None,
  Create,
  CreateMultiple,
  EditMultiple,
  Confirm,
  Cancel,
  Import,
  ConnectHW,
  ImportSrp,
}

export const CAMERA_PERMISSION_STATUS = {
  granted: 'granted',
  notDetermined: 'not-determined',
  denied: 'denied',
  restricted: 'restricted',
} as const;
