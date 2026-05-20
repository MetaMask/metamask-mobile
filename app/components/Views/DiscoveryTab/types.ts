// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { SharedTabProps } from '../shared/browser-tab-shared-types';

/**
 * The props for the DiscoveryTab component
 * Extends shared props that are common to both BrowserTab and DiscoveryTab
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DiscoveryTabProps = SharedTabProps;
