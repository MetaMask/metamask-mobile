import React, { useCallback } from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { GachaAttentionBannerTestIds } from '../../Gacha.testIds';
import type { PackOperation } from '../../providers/collector-crypt/types';
import { isOperationResumable } from '../../providers/collector-crypt/utils/operations';

export type AttentionKind = 'processing' | 'unrevealed' | 'attention';

/** Opened -> card to reveal; resumable without error -> processing; else attention. */
export const getAttentionKind = (operation: PackOperation): AttentionKind => {
  if (operation.status === 'opened') {
    return 'unrevealed';
  }
  if (isOperationResumable(operation) && !operation.error) {
    return 'processing';
  }
  return 'attention';
};

const BANNER_CONTENT: Record<
  AttentionKind,
  { severity: BannerAlertSeverity; title: string; description: string }
> = {
  processing: {
    severity: BannerAlertSeverity.Info,
    title: 'gacha.pending.processing_title',
    description: 'gacha.pending.processing_description',
  },
  unrevealed: {
    severity: BannerAlertSeverity.Success,
    title: 'gacha.pending.unrevealed_title',
    description: 'gacha.pending.unrevealed_description',
  },
  attention: {
    severity: BannerAlertSeverity.Warning,
    title: 'gacha.pending.attention_title',
    description: 'gacha.pending.attention_description',
  },
};

export interface AttentionBannerProps {
  operation: PackOperation;
  onView: (memo: string) => void;
}

/** Banner for the newest pack operation that needs the user (processing, reveal, error). */
const AttentionBanner = ({ operation, onView }: AttentionBannerProps) => {
  const content = BANNER_CONTENT[getAttentionKind(operation)];
  const handleView = useCallback(
    () => onView(operation.memo),
    [onView, operation.memo],
  );

  return (
    <BannerAlert
      severity={content.severity}
      title={strings(content.title)}
      description={strings(content.description)}
      actionButtonLabel={strings('gacha.pending.view')}
      actionButtonOnPress={handleView}
      testID={GachaAttentionBannerTestIds.BANNER}
    />
  );
};

export default AttentionBanner;
