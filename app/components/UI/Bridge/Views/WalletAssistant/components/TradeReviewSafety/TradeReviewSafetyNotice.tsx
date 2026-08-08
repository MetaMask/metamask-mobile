import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import React from 'react';

import {
  getTradeReviewSafetyNotice,
  TradeReviewSafetyMetadata,
  TradeReviewSafetySeverity,
} from './tradeReviewSafety';

export interface WalletAssistantTradeReviewSafetyProps {
  metadata: TradeReviewSafetyMetadata;
  testID?: string;
}

const BANNER_SEVERITY: Record<TradeReviewSafetySeverity, BannerAlertSeverity> =
  {
    [TradeReviewSafetySeverity.Info]: BannerAlertSeverity.Info,
    [TradeReviewSafetySeverity.Warning]: BannerAlertSeverity.Warning,
    [TradeReviewSafetySeverity.Danger]: BannerAlertSeverity.Danger,
  };

export const WalletAssistantTradeReviewSafety = ({
  metadata,
  testID = 'wallet-assistant-trade-review-safety',
}: WalletAssistantTradeReviewSafetyProps) => {
  const notice = getTradeReviewSafetyNotice(metadata);

  return (
    <BannerAlert
      severity={BANNER_SEVERITY[notice.severity]}
      title={notice.title}
      description={notice.description}
      testID={testID}
    />
  );
};
