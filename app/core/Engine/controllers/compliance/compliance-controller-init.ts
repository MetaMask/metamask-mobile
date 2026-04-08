import {
  ComplianceController,
  type ComplianceControllerMessenger,
} from '@metamask/compliance-controller';
import type { ControllerInitFunction } from '../../types';

/**
 * Initialize the ComplianceController.
 *
 * The controller is always instantiated so its state slot exists. Per-address
 * compliance checks are performed on demand via `checkWalletCompliance` /
 * `checkWalletsCompliance`, which are called by the `useComplianceGate` hook
 * on mount (prefetch) and at gate time.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger for the controller.
 * @param request.persistedState - Persisted state to hydrate from.
 * @returns The initialized ComplianceController.
 */
export const complianceControllerInit: ControllerInitFunction<
  ComplianceController,
  ComplianceControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new ComplianceController({
    messenger: controllerMessenger,
    state: persistedState.ComplianceController,
  });

  return { controller };
};
