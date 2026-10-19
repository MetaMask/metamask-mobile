import React from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { SentinelFeeTokenValidationReason } from '../../../hooks/useSentinelFeeTokenValidation';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';

interface LimitOrderFeeTokenErrorBannerProps {
  reason?: SentinelFeeTokenValidationReason;
  onRetry: () => void;
}

export function LimitOrderFeeTokenErrorBanner({
  reason,
  onRetry,
}: LimitOrderFeeTokenErrorBannerProps) {
  if (reason === 'unsupported-pair') {
    return (
      <BannerAlert
        severity={BannerAlertSeverity.Danger}
        description={strings('bridge.limit.unsupported_fee_token_pair')}
        testID={BridgeViewSelectorsIDs.LIMIT_FEE_TOKEN_UNSUPPORTED_BANNER}
      />
    );
  }

  if (reason === 'unavailable') {
    return (
      <BannerAlert
        severity={BannerAlertSeverity.Danger}
        description={strings('bridge.limit.fee_tokens_unavailable')}
        actionButtonLabel={strings('bridge.limit.try_again')}
        actionButtonOnPress={onRetry}
        actionButtonProps={{
          testID: BridgeViewSelectorsIDs.LIMIT_FEE_TOKEN_RETRY_BUTTON,
        }}
        testID={BridgeViewSelectorsIDs.LIMIT_FEE_TOKENS_UNAVAILABLE_BANNER}
      />
    );
  }

  return null;
}
