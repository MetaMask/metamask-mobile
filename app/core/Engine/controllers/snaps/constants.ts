import {
  SnapControllerStateChangeEvent as SnapControllerStateChangeEventType,
  SnapControllerHandleRequestAction as SnapControllerHandleRequestActionType,
  SnapControllerClearSnapStateAction as SnapControllerClearSnapStateActionType,
  SnapControllerGetSnapAction as SnapControllerGetSnapActionType,
  SnapControllerGetSnapStateAction as SnapControllerGetSnapStateActionType,
  SnapControllerUpdateSnapStateAction as SnapControllerUpdateSnapStateActionType,
  SnapControllerGetPermittedSnapsAction as SnapControllerGetPermittedSnapsActionType,
  SnapControllerInstallSnapsAction as SnapControllerInstallSnapsActionType,
  SnapControllerGetSnapFileAction as SnapControllerGetSnapFileActionType,
  SnapControllerSnapInstalledEvent as SnapControllerSnapInstalledEventType,
  SnapControllerSnapUpdatedEvent as SnapControllerSnapUpdatedEventType,
  SnapControllerSnapUninstalledEvent as SnapControllerSnapUninstalledEventType,
  SnapControllerSnapEnabledEvent as SnapControllerSnapEnabledEventType,
  SnapControllerSnapDisabledEvent as SnapControllerSnapDisabledEventType,
  SnapControllerGetAllSnapsAction as SnapControllerGetAllSnapsActionType,
  SnapControllerIsMinimumPlatformVersionAction as SnapControllerIsMinimumPlatformVersionActionType,
  SnapInterfaceControllerCreateInterfaceAction as SnapInterfaceControllerCreateInterfaceActionType,
  SnapInterfaceControllerUpdateInterfaceAction as SnapInterfaceControllerUpdateInterfaceActionType,
  SnapInterfaceControllerResolveInterfaceAction as SnapInterfaceControllerResolveInterfaceActionType,
  SnapInterfaceControllerUpdateInterfaceStateAction as SnapInterfaceControllerUpdateInterfaceStateActionType,
  CronjobControllerCancelAction as CronjobControllerCancelActionType,
  CronjobControllerGetAction as CronjobControllerGetActionType,
  WebSocketServiceOpenAction as WebSocketServiceOpenActionType,
  WebSocketServiceCloseAction as WebSocketServiceCloseActionType,
  WebSocketServiceGetAllAction as WebSocketServiceGetAllActionType,
  WebSocketServiceSendMessageAction as WebSocketServiceSendMessageActionType,
} from '@metamask/snaps-controllers';

// SnapController Events
export const SnapControllerStateChangeEvent: SnapControllerStateChangeEventType['type'] =
  'SnapController:stateChange';

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

export const SnapControllerClearSnapStateAction: SnapControllerClearSnapStateActionType['type'] =
  'SnapController:clearSnapState';

export const SnapControllerGetSnapAction: SnapControllerGetSnapActionType['type'] =
  'SnapController:getSnap';

export const SnapControllerGetSnapStateAction: SnapControllerGetSnapStateActionType['type'] =
  'SnapController:getSnapState';

export const SnapControllerUpdateSnapStateAction: SnapControllerUpdateSnapStateActionType['type'] =
  'SnapController:updateSnapState';

export const SnapControllerGetPermittedSnapsAction: SnapControllerGetPermittedSnapsActionType['type'] =
  'SnapController:getPermittedSnaps';

export const SnapControllerInstallSnapsAction: SnapControllerInstallSnapsActionType['type'] =
  'SnapController:installSnaps';

export const SnapControllerGetSnapFileAction: SnapControllerGetSnapFileActionType['type'] =
  'SnapController:getSnapFile';

export const SnapControllerGetAllSnapsAction: SnapControllerGetAllSnapsActionType['type'] =
  'SnapController:getAllSnaps';

export const SnapControllerIsMinimumPlatformVersionAction: SnapControllerIsMinimumPlatformVersionActionType['type'] =
  'SnapController:isMinimumPlatformVersion';

// SnapInterfaceController Actions
export const SnapInterfaceControllerCreateInterfaceAction: SnapInterfaceControllerCreateInterfaceActionType['type'] =
  'SnapInterfaceController:createInterface';

export const SnapInterfaceControllerUpdateInterfaceAction: SnapInterfaceControllerUpdateInterfaceActionType['type'] =
  'SnapInterfaceController:updateInterface';

export const SnapInterfaceControllerResolveInterfaceAction: SnapInterfaceControllerResolveInterfaceActionType['type'] =
  'SnapInterfaceController:resolveInterface';

export const SnapInterfaceControllerUpdateInterfaceStateAction: SnapInterfaceControllerUpdateInterfaceStateActionType['type'] =
  'SnapInterfaceController:updateInterfaceState';

// CronjobController Actions
export const CronjobControllerCancelAction: CronjobControllerCancelActionType['type'] =
  'CronjobController:cancel';

export const CronjobControllerGetAction: CronjobControllerGetActionType['type'] =
  'CronjobController:get';

// WebSocketService Actions
export const WebSocketServiceOpenAction: WebSocketServiceOpenActionType['type'] =
  'WebSocketService:open';

export const WebSocketServiceCloseAction: WebSocketServiceCloseActionType['type'] =
  'WebSocketService:close';

export const WebSocketServiceGetAllAction: WebSocketServiceGetAllActionType['type'] =
  'WebSocketService:getAll';

export const WebSocketServiceSendMessageAction: WebSocketServiceSendMessageActionType['type'] =
  'WebSocketService:sendMessage';
