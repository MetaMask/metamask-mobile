export interface IRPCBridgeAdapter {
  on: (event: 'response', listener: (response: unknown) => void) => void;
  send: (request: unknown) => void;
  dispose: () => void;
}
