import { ApprovedHosts, SDKSessions } from '../../core/SDKConnect/SDKConnect';
export interface WC2Metadata {
  id: string;
  url: string;
  name: string;
  icon: string;
}
export interface SDKState {
  connections: SDKSessions;
  approvedHosts: ApprovedHosts;
  dappConnections: SDKSessions;
  // Link to metadata of last created wallet connect session.
  wc2Metadata?: WC2Metadata;
}
