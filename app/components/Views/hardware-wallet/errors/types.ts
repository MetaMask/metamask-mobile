import type { ComponentType } from 'react';
import type { ErrorCode, HardwareWalletError } from '@metamask/hw-wallet-sdk';

export interface ErrorComponentProps {
  errorCode: ErrorCode;
  error?: HardwareWalletError;
  isBusy: boolean;
  onRetry: () => void;
  onContinue: () => void;
  onExit: () => void;
  onOpenSettings: () => void;
  onOpenBluetoothSettings: () => void;
}

export type ErrorRenderer = ComponentType<ErrorComponentProps>;

export type ErrorRendererMap = Partial<Record<ErrorCode, ErrorRenderer>>;
