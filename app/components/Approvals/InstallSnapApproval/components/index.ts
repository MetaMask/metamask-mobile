/* eslint-disable import/prefer-default-export */
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps)
import { InstallSnapConnectionRequest } from './InstallSnapConnectionRequest';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import { InstallSnapSuccess } from './InstallSnapSuccess';
import { InstallSnapError } from './InstallSnapError';
import { InstallSnapPermissionsRequest } from './InstallSnapPermissionsRequest';
///: END:ONLY_INCLUDE_IF

///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
export { InstallSnapPermissionsRequest };
export { InstallSnapError };
export { InstallSnapSuccess };
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps)
export { InstallSnapConnectionRequest };
///: END:ONLY_INCLUDE_IF
