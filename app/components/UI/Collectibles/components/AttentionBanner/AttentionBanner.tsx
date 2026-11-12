import React, { useCallback } from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { CollectiblesAttentionBannerTestIds } from '../../Collectibles.testIds';
import type { CollectiblesPackOperation } from '../../types';
import { isOperationResumable } from '../../providers/pack-partner/utils/operations';

export type AttentionKind = 'processing' | 'unrevealed' | 'attention';

/** Opened -> card to reveal; resumable without error -> processing; else attention. */
export const getAttentionKind = (
  operation: CollectiblesPackOperation,
): AttentionKind => {
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
    title: 'collectibles.pending.processing_title',
    description: 'collectibles.pending.processing_description',
  },
  unrevealed: {
    severity: BannerAlertSeverity.Success,
    title: 'collectibles.pending.unrevealed_title',
    description: 'collectibles.pending.unrevealed_description',
  },
  attention: {
    severity: BannerAlertSeverity.Warning,
    title: 'collectibles.pending.attention_title',
    description: 'collectibles.pending.attention_description',
  },
};

export interface AttentionBannerProps {
  operation: CollectiblesPackOperation;
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
      actionButtonLabel={strings('collectibles.pending.view')}
      actionButtonOnPress={handleView}
      testID={CollectiblesAttentionBannerTestIds.BANNER}
    />
  );
};

export default AttentionBanner;
