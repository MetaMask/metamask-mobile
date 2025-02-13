import {
  SnapStateChange as SnapControllerStateChangeEventType,
  HandleSnapRequest as SnapControllerHandleRequestActionType,
  ClearSnapState as SnapControllerClearSnapStateActionType,
  GetSnap as SnapControllerGetSnapActionType,
  GetSnapState as SnapControllerGetSnapStateActionType,
  UpdateSnapState as SnapControllerUpdateSnapStateActionType,
  GetPermittedSnaps as SnapControllerGetPermittedSnapsActionType,
  InstallSnaps as SnapControllerInstallSnapsActionType,
  GetSnapFile as SnapControllerGetSnapFileActionType,
} from '@metamask/snaps-controllers';

// Events
export const SnapControllerStateChangeEvent: SnapControllerStateChangeEventType['type'] =
  'SnapController:stateChange';

// Actions
export const SnapControllerHandleRequestAction: SnapControllerHandleRequestActionType['type'] =
  'SnapController:handleRequest';

export const SnapControllerClearSnapStateAction: SnapControllerClearSnapStateActionType['type'] =
  'SnapController:clearSnapState';

export const SnapControllerGetSnapAction: SnapControllerGetSnapActionType['type'] =
  'SnapController:get';

export const SnapControllerGetSnapStateAction: SnapControllerGetSnapStateActionType['type'] =
  'SnapController:getSnapState';

export const SnapControllerUpdateSnapStateAction: SnapControllerUpdateSnapStateActionType['type'] =
  'SnapController:updateSnapState';

export const SnapControllerGetPermittedSnapsAction: SnapControllerGetPermittedSnapsActionType['type'] =
  'SnapController:getPermitted';

export const SnapControllerInstallSnapsAction: SnapControllerInstallSnapsActionType['type'] =
  'SnapController:install';

export const SnapControllerGetSnapFileAction: SnapControllerGetSnapFileActionType['type'] =
  'SnapController:getFile';
