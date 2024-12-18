///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import SnapBridge from './SnapBridge';
import {
  ExcludedSnapPermissions,
  ExcludedSnapEndowments,
  EndowmentPermissions,
} from './permissions/permissions';
import {
  detectSnapLocation,
  DetectSnapLocationOptions,
} from './location';

export {
  SnapBridge,
  ExcludedSnapPermissions,
  ExcludedSnapEndowments,
  EndowmentPermissions,
  detectSnapLocation,
};
export type { DetectSnapLocationOptions };
///: END:ONLY_INCLUDE_IF
