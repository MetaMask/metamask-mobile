export enum ConnectionStatus {
  // DISCONNECTED: counterparty is disconnected
  DISCONNECTED = 'disconnected',
  // WAITING: means connected to the websocket but the counterparty (MetaMask or Dapps) isn't.
  WAITING = 'waiting',
  // TIMEOUT: means auto connect didn't establish link within given timeout
  TIMEOUT = 'timeout',
  // LINKED: is connected after handshake, using a different verb to avoid confusion to just being connected to the websocket and waiting for counterpart.
  // LINKED is set when receiving 'READY' message from counterpart.
  LINKED = 'linked',
  // PAUSED:
  PAUSED = 'paused',
  // TERMINATED: if a user manually disconnect the session.
  TERMINATED = 'terminated',
}
