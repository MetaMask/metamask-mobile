import React from 'react';
import { ConnectionStatus, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import type { DiscoveryStep } from '../../DiscoveryFlow.machine.types';
import DiscoveryErrorScreen from './DiscoveryErrorScreen';
import {
  DISCOVERY_ERROR_STEPS,
  type DiscoveryFlowErrorStep,
} from './discoveryErrorScreenConfigs';
import type { DiscoveryErrorScreenActionProps } from './DiscoveryErrorScreen.types';

export interface DiscoveryErrorScreenRouterProps
  extends DiscoveryErrorScreenActionProps {
  step: DiscoveryStep;
  showGenericProviderError?: boolean;
  walletType?: HardwareWalletType;
}

const isDiscoveryFlowErrorStep = (
  step: DiscoveryStep,
): step is DiscoveryFlowErrorStep =>
  (DISCOVERY_ERROR_STEPS as readonly DiscoveryStep[]).includes(step);

const DiscoveryErrorScreenRouter = ({
  step,
  showGenericProviderError = false,
  onRetry,
  onNotNow,
  onContinue,
  walletType,
}: DiscoveryErrorScreenRouterProps) => {
  if (showGenericProviderError) {
    return (
      <DiscoveryErrorScreen
        variant="something-went-wrong"
        onRetry={onRetry}
        onContinue={onContinue}
        walletType={walletType}
      />
    );
  }

  if (!isDiscoveryFlowErrorStep(step)) {
    return null;
  }

  return (
    <DiscoveryErrorScreen
      variant={step}
      onRetry={onRetry}
      onNotNow={onNotNow}
      walletType={walletType}
    />
  );
};

/**
 * Type guard that reports whether a discovery step represents one of the
 * dedicated error screens (device locked, transport unavailable, etc.).
 *
 * @param step - The step to test.
 * @returns True if the step maps to a discovery-flow error screen.
 */
export const isDiscoveryErrorStep = (step: DiscoveryStep): boolean =>
  isDiscoveryFlowErrorStep(step);

/**
 * Reports whether the flow should fall back to the generic
 * "something went wrong" error screen, i.e. when the provider reports
 * an error state that does not map to any specific discovery step.
 *
 * @param connectionStatus - The current hardware-wallet connection status.
 * @param providerErrorStep - The step derived from the provider error, if any.
 * @returns True when the generic error screen should be shown.
 */
export const shouldShowGenericProviderError = (
  connectionStatus: ConnectionStatus,
  providerErrorStep: DiscoveryStep | null,
): boolean =>
  connectionStatus === ConnectionStatus.ErrorState &&
  providerErrorStep === null;

export default DiscoveryErrorScreenRouter;
