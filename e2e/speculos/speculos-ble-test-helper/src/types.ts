export interface SpeculosBleConfig {
  speculosHost: string;
  speculosApduPort: number;
  speculosApiPort: number;
  controlApiPort?: number;
  deviceName?: string;
}

export interface ButtonPress {
  button: 'left' | 'right' | 'both';
  count?: number;
}

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'exchanging' | 'disconnecting';

export interface ControlApiHealthResponse {
  status: string;
  ble_state: ConnectionState;
  speculos_connected: boolean;
}

export interface ApduLogEntry {
  timestamp: number;
  direction: string;
  data_hex: string;
  tag: string;
}
