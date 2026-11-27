import {
  SnapControllerHandleRequestAction as SnapControllerHandleRequestActionType,
  SnapControllerSnapInstalledEvent as SnapControllerSnapInstalledEventType,
  SnapControllerSnapUpdatedEvent as SnapControllerSnapUpdatedEventType,
  SnapControllerSnapUninstalledEvent as SnapControllerSnapUninstalledEventType,
  SnapControllerSnapEnabledEvent as SnapControllerSnapEnabledEventType,
  SnapControllerSnapDisabledEvent as SnapControllerSnapDisabledEventType,
  SnapControllerGetAllSnapsAction as SnapControllerGetAllSnapsActionType,
} from '@metamask/snaps-controllers';

// SnapController Events
export const SnapControllerSnapInstalledEvent: SnapControllerSnapInstalledEventType['type'] =
  'SnapController:snapInstalled';

export const SnapControllerSnapUpdatedEvent: SnapControllerSnapUpdatedEventType['type'] =
  'SnapController:snapUpdated';

export const SnapControllerSnapUninstalledEvent: SnapControllerSnapUninstalledEventType['type'] =
  'SnapController:snapUninstalled';

export const SnapControllerSnapEnabledEvent: SnapControllerSnapEnabledEventType['type'] =
  'SnapController:snapEnabled';

export const SnapControllerSnapDisabledEvent: SnapControllerSnapDisabledEventType['type'] =
  'SnapController:snapDisabled';

// SnapController Actions
export const SnapControllerHandleRequestAction: SnapControllerHandleRequestActionType['type'] =
  'SnapController:handleRequest';

export const SnapControllerGetAllSnapsAction: SnapControllerGetAllSnapsActionType['type'] =
  'SnapController:getAllSnaps';
