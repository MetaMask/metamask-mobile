import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { registerWalletErrors } from '../registry';
import LedgerAppClosedError from '../LedgerAppClosedError';
import LedgerBlindSigningDisabledError from '../LedgerBlindSigningDisabledError';
import type { ErrorRendererMap } from '../types';

const LEDGER_ERROR_MAP: ErrorRendererMap = {
  [ErrorCode.DeviceStateEthAppClosed]: LedgerAppClosedError,
  [ErrorCode.DeviceMissingCapability]: LedgerAppClosedError,
  [ErrorCode.DeviceStateBlindSignNotSupported]: LedgerBlindSigningDisabledError,
};

registerWalletErrors(HardwareWalletType.Ledger, LEDGER_ERROR_MAP);

export { LedgerAppClosedError, LedgerBlindSigningDisabledError };
