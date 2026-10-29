import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import type { SentinelFeeTokenValidationReason } from '../../hooks/useSentinelFeeTokenValidation';

interface SentinelFeeTokenErrorBannerTestIDs {
  unsupportedPair: string;
  unavailable: string;
  retryButton: string;
}

interface SentinelFeeTokenErrorBannerProps {
  reason?: SentinelFeeTokenValidationReason;
  unsupportedPairMessage: string;
  unavailableMessage: string;
  retryLabel: string;
  onRetry: () => void;
  testIDs: SentinelFeeTokenErrorBannerTestIDs;
}

export function SentinelFeeTokenErrorBanner({
  reason,
  unsupportedPairMessage,
  unavailableMessage,
  retryLabel,
  onRetry,
  testIDs,
}: SentinelFeeTokenErrorBannerProps) {
  if (reason === 'unsupported-pair') {
    return (
      <BannerAlert
        severity={BannerAlertSeverity.Danger}
        description={unsupportedPairMessage}
        testID={testIDs.unsupportedPair}
      />
    );
  }

  if (reason === 'unavailable') {
    return (
      <BannerAlert
        severity={BannerAlertSeverity.Danger}
        description={unavailableMessage}
        actionButtonLabel={retryLabel}
        actionButtonOnPress={onRetry}
        actionButtonProps={{ testID: testIDs.retryButton }}
        testID={testIDs.unavailable}
      />
    );
  }

  return null;
}
