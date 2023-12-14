///: BEGIN:ONLY_INCLUDE_IF(snaps)
import SnapBridge from './SnapBridge';
import SnapDuplex from './SnapDuplex';
import WebviewExecutionService from './WebviewExecutionService';
import WebviewPostMessageStream from './WebviewPostMessageStream';
import SnapWebviewPostMessageStream from './SnapWebviewPostMessageStream';
import snapsState from './SnapsState';
import {
  ExcludedSnapPermissions,
  ExcludedSnapEndowments,
} from './permissions/permissions';
import {
  detectSnapLocation,
  fetchFunction,
  DetectSnapLocationOptions,
} from './location';

export {
  snapsState,
  SnapDuplex,
  SnapBridge,
  WebviewExecutionService,
  WebviewPostMessageStream,
  SnapWebviewPostMessageStream,
  ExcludedSnapPermissions,
  ExcludedSnapEndowments,
  fetchFunction,
  detectSnapLocation,
};
export type { DetectSnapLocationOptions };
///: END:ONLY_INCLUDE_IF
