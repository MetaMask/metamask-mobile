import {
  DiscoveryStep,
  HardwareWalletDiscoveryEventType,
  type MachineEvent,
} from './DiscoveryFlow.machine.types';
import type { DeviceUIConfig } from './DiscoveryFlow.types';
import { parseErrorByType } from '../../../../core/HardwareWallet/errors';

/**
 * Pure state-machine reducer for the hardware wallet discovery flow.
 * Computes the next {@link DiscoveryStep} given the current step, an incoming
 * event, and the active device UI configuration. The function never mutates
 * external state; side effects are the caller's responsibility.
 *
 * @param currentStep - The step the flow is currently in.
 * @param event - The event to apply to the current step.
 * @param config - The UI configuration (used to map errors to steps).
 * @returns The step the flow should transition to.
 */
export function transition(
  currentStep: DiscoveryStep,
  event: MachineEvent,
  config: DeviceUIConfig,
): DiscoveryStep {
  switch (currentStep) {
    case DiscoveryStep.Searching:
      return transitionFromSearching(event, config);
    case DiscoveryStep.Found:
      return transitionFromFound(event, config);
    case DiscoveryStep.Accounts:
      return transitionFromAccounts(event);
    case DiscoveryStep.NotFound:
      return transitionFromNotFound(event, config);
    default:
      return transitionFromErrorState(currentStep, event);
  }
}

function transitionFromSearching(
  event: MachineEvent,
  config: DeviceUIConfig,
): DiscoveryStep {
  switch (event.type) {
    case HardwareWalletDiscoveryEventType.PermissionsGranted:
    case HardwareWalletDiscoveryEventType.TransportAvailable:
      return DiscoveryStep.Searching;
    case HardwareWalletDiscoveryEventType.PermissionsDenied:
      return (
        config.errorToStepMap[event.errorCode] ?? DiscoveryStep.PermissionDenied
      );
    case HardwareWalletDiscoveryEventType.DeviceFound:
      return DiscoveryStep.Found;
    case HardwareWalletDiscoveryEventType.Timeout:
      return DiscoveryStep.NotFound;
    case HardwareWalletDiscoveryEventType.ScanError:
      return resolveScanErrorStep(event.error, config);
    case HardwareWalletDiscoveryEventType.TransportUnavailable:
      return DiscoveryStep.TransportUnavailable;
    case HardwareWalletDiscoveryEventType.ConnectError:
      return config.errorToStepMap[event.errorCode] ?? DiscoveryStep.NotFound;
    default:
      return DiscoveryStep.Searching;
  }
}

function transitionFromFound(
  event: MachineEvent,
  config: DeviceUIConfig,
): DiscoveryStep {
  switch (event.type) {
    case HardwareWalletDiscoveryEventType.OpenAccounts:
      return DiscoveryStep.Accounts;
    case HardwareWalletDiscoveryEventType.ConnectError:
      return config.errorToStepMap[event.errorCode] ?? DiscoveryStep.NotFound;
    default:
      return DiscoveryStep.Found;
  }
}

function transitionFromAccounts(event: MachineEvent): DiscoveryStep {
  switch (event.type) {
    case HardwareWalletDiscoveryEventType.Back:
      return DiscoveryStep.Found;
    case HardwareWalletDiscoveryEventType.Retry:
      return DiscoveryStep.Searching;
    default:
      return DiscoveryStep.Accounts;
  }
}

function transitionFromNotFound(
  event: MachineEvent,
  config: DeviceUIConfig,
): DiscoveryStep {
  switch (event.type) {
    case HardwareWalletDiscoveryEventType.Retry:
      return DiscoveryStep.Searching;
    case HardwareWalletDiscoveryEventType.PermissionsDenied:
      return (
        config.errorToStepMap[event.errorCode] ?? DiscoveryStep.PermissionDenied
      );
    case HardwareWalletDiscoveryEventType.TransportUnavailable:
      return DiscoveryStep.TransportUnavailable;
    default:
      return DiscoveryStep.NotFound;
  }
}

function transitionFromErrorState(
  step: DiscoveryStep,
  event: MachineEvent,
): DiscoveryStep {
  switch (event.type) {
    case HardwareWalletDiscoveryEventType.Retry:
      return DiscoveryStep.Searching;
    default:
      return step;
  }
}

function resolveScanErrorStep(
  error: Error,
  config: DeviceUIConfig,
): DiscoveryStep {
  const { code } = parseErrorByType(error, config.walletType);
  return config.errorToStepMap[code] ?? DiscoveryStep.NotFound;
}
