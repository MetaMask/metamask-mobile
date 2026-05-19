import { createNavigationDetails } from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(WPC-403): allowed by ADR-0020 backlog
import type { SimpleWebviewParams } from '../Webview/Webview.types';

// Re-export for backwards compatibility
export type { SimpleWebviewParams };

const createWebviewNavDetails = createNavigationDetails<SimpleWebviewParams>(
  Routes.WEBVIEW.MAIN,
  Routes.WEBVIEW.SIMPLE,
);

export default createWebviewNavDetails;
