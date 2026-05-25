export const SPECULOS_DEVICE_NAME = 'Ledger Nano X';
export const SPECULOS_DEVICE_ID = 'speculos-virtual-ledger';

export const SPECULOS_DEFAULTS = {
  SPECULOS_HOST: '127.0.0.1',
  SPECULOS_APDU_PORT: 9999,
  SPECULOS_API_PORT: 5000,
  CONTROL_API_PORT: 5002,
} as const;

export const DEFAULT_SIGNING_APPROVE_SEQUENCE: Array<{
  button: 'left' | 'right' | 'both';
  count: number;
}> = [
  { button: 'right', count: 4 },
  { button: 'both', count: 1 },
];

export const DEFAULT_SIGNING_REJECT_SEQUENCE: Array<{
  button: 'left' | 'right' | 'both';
  count: number;
}> = [
  { button: 'left', count: 1 },
  { button: 'both', count: 1 },
];
