import { ApprovedHosts, SDKSessions } from '../../core/SDKConnect/SDKConnect';

export interface SDKState {
  connections: SDKSessions;
  approvedHosts: ApprovedHosts;
  androidConnections: SDKSessions;
}
