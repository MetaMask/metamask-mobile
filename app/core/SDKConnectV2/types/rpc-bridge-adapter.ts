/**
 * Defines the contract for the RPC bridge adapter.
 * This adapter is used to bridge the communication between the SDKConnectV2
 * and the background bridge.
 */
export interface IRPCBridgeAdapter {
  on: (event: 'response', listener: (response: unknown) => void) => void;
  send: (request: unknown) => void;
  dispose: () => void;
}
