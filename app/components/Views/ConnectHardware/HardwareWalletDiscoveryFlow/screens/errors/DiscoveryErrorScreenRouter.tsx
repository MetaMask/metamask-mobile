import React from 'react';
import { ConnectionStatus, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import type { DiscoveryStep } from '../../DiscoveryFlow.types';
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

export const isDiscoveryErrorStep = (step: DiscoveryStep): boolean =>
  isDiscoveryFlowErrorStep(step);

export const shouldShowGenericProviderError = (
  connectionStatus: ConnectionStatus,
  providerErrorStep: DiscoveryStep | null,
): boolean =>
  connectionStatus === ConnectionStatus.ErrorState &&
  providerErrorStep === null;

export default DiscoveryErrorScreenRouter;
