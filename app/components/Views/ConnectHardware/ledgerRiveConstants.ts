export const LEDGER_ARTBOARD_NAME = 'Ledger';
export const LEDGER_STATE_MACHINE_NAME = 'Ledger_states';

export const LEDGER_RIVE = {
  artboardName: LEDGER_ARTBOARD_NAME,
  stateMachineName: LEDGER_STATE_MACHINE_NAME,
} as const;

export const LEDGER_RIVE_STATE_TRIGGER = {
  Reset: 'reset',
  Error: 'error',
  Locked: 'ledger_locked',
} as const;
