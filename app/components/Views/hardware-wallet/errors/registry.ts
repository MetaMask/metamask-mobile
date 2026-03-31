import type { ComponentType } from 'react';
import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import type { ErrorComponentProps, ErrorRendererMap } from './types';
import {
  TransportError,
  DeviceNotFoundError,
  DeviceUnresponsiveError,
  GenericError,
} from './shared';

const WALLET_ERROR_MAPS: Partial<Record<HardwareWalletType, ErrorRendererMap>> =
  {};

let SHARED_ERROR_MAP: ErrorRendererMap = {};

let GENERIC_FALLBACK: ComponentType<ErrorComponentProps> | null = null;

export function resetRegistry(): void {
  Object.keys(WALLET_ERROR_MAPS).forEach(
    (key) => delete WALLET_ERROR_MAPS[key as HardwareWalletType],
  );
  SHARED_ERROR_MAP = {};
  GENERIC_FALLBACK = null;
}

export function registerSharedErrors(
  map: ErrorRendererMap,
  fallback: ComponentType<ErrorComponentProps>,
): void {
  SHARED_ERROR_MAP = map;
  GENERIC_FALLBACK = fallback;
}

export function registerWalletErrors(
  walletType: HardwareWalletType,
  map: ErrorRendererMap,
): void {
  WALLET_ERROR_MAPS[walletType] = map;
}

export function resolveErrorComponent(
  walletType: HardwareWalletType | null,
  errorCode: ErrorCode | undefined,
): ComponentType<ErrorComponentProps> {
  // 1. Wallet-specific
  if (walletType && errorCode) {
    const walletMap = WALLET_ERROR_MAPS[walletType];
    const walletComponent = walletMap?.[errorCode];
    if (walletComponent) {
      return walletComponent;
    }
  }

  // 2. Shared
  if (errorCode) {
    const sharedComponent = SHARED_ERROR_MAP[errorCode];
    if (sharedComponent) {
      return sharedComponent;
    }
  }

  // 3. DeviceNotFound for undefined error code
  if (errorCode === undefined) {
    const notFoundComponent = SHARED_ERROR_MAP[ErrorCode.DeviceNotFound];
    if (notFoundComponent) {
      return notFoundComponent;
    }
  }

  // 4. Generic fallback
  if (GENERIC_FALLBACK) {
    return GENERIC_FALLBACK;
  }

  throw new Error(
    `No error component registered for walletType=${walletType} errorCode=${errorCode}`,
  );
}

const INITIAL_SHARED_MAP: ErrorRendererMap = {
  [ErrorCode.PermissionBluetoothDenied]: TransportError,
  [ErrorCode.PermissionLocationDenied]: TransportError,
  [ErrorCode.PermissionNearbyDevicesDenied]: TransportError,
  [ErrorCode.BluetoothDisabled]: TransportError,
  [ErrorCode.BluetoothConnectionFailed]: TransportError,
  [ErrorCode.DeviceNotFound]: DeviceNotFoundError,
  [ErrorCode.DeviceUnresponsive]: DeviceUnresponsiveError,
  [ErrorCode.ConnectionTimeout]: DeviceNotFoundError,
};

registerSharedErrors(INITIAL_SHARED_MAP, GenericError);
