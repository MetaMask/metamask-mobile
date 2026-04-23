import { ErrorCode } from '@metamask/hw-wallet-sdk';
import type {
  DiscoveryStep,
  MachineEvent,
  DeviceUIConfig,
} from './DiscoveryFlow.types';

export function transition(
  currentStep: DiscoveryStep,
  event: MachineEvent,
  config: DeviceUIConfig,
): DiscoveryStep {
  switch (currentStep) {
    case 'searching':
      return transitionFromSearching(event, config);
    case 'found':
      return transitionFromFound(event, config);
    case 'accounts':
      return transitionFromAccounts(event);
    case 'not-found':
      return transitionFromNotFound(event);
    default:
      return transitionFromErrorState(currentStep, event);
  }
}

function transitionFromSearching(
  event: MachineEvent,
  config: DeviceUIConfig,
): DiscoveryStep {
  switch (event.type) {
    case 'PERMISSIONS_GRANTED':
    case 'TRANSPORT_AVAILABLE':
      return 'searching';
    case 'PERMISSIONS_DENIED':
      return config.errorToStepMap[event.errorCode] ?? 'permission-denied';
    case 'DEVICE_FOUND':
      return 'found';
    case 'TIMEOUT':
      return 'not-found';
    case 'SCAN_ERROR':
      return resolveScanErrorStep(event.error, config);
    case 'TRANSPORT_UNAVAILABLE':
      return 'transport-unavailable';
    case 'CONNECT_ERROR':
      return config.errorToStepMap[event.errorCode] ?? 'not-found';
    default:
      return 'searching';
  }
}

function transitionFromFound(
  event: MachineEvent,
  config: DeviceUIConfig,
): DiscoveryStep {
  switch (event.type) {
    case 'OPEN_ACCOUNTS':
      return 'accounts';
    case 'CONNECT_ERROR':
      return config.errorToStepMap[event.errorCode] ?? 'not-found';
    default:
      return 'found';
  }
}

function transitionFromAccounts(event: MachineEvent): DiscoveryStep {
  switch (event.type) {
    case 'BACK':
      return 'found';
    case 'RETRY':
      return 'searching';
    default:
      return 'accounts';
  }
}

function transitionFromNotFound(event: MachineEvent): DiscoveryStep {
  switch (event.type) {
    case 'RETRY':
      return 'searching';
    default:
      return 'not-found';
  }
}

function transitionFromErrorState(
  step: DiscoveryStep,
  event: MachineEvent,
): DiscoveryStep {
  switch (event.type) {
    case 'RETRY':
      return 'searching';
    default:
      return step;
  }
}

function resolveScanErrorStep(
  error: Error,
  config: DeviceUIConfig,
): DiscoveryStep {
  const name = error.name?.toLowerCase() ?? '';
  const message = error.message?.toLowerCase() ?? '';

  if (
    name === 'bleerror' ||
    message.includes('bleerror') ||
    message.includes('bluetooth')
  ) {
    return (
      config.errorToStepMap[ErrorCode.BluetoothConnectionFailed] ??
      'transport-connection-failed'
    );
  }

  return 'not-found';
}
