import { strings } from '../../../../../../../locales/i18n';
import type { UnrealizedPnL } from '../../../../../UI/Predict/types';
import { formatPredictUnrealizedPnLStringParts } from '../../../../../UI/Predict/utils/format';
import type { PredictHomepageUnrealizedPnlRowState } from '../predictionsSectionTypes';

export function getPredictHomepageUnrealizedPnlRowState(input: {
  hasPositions: boolean;
  privacyMode: boolean;
  isPnlLoading: boolean;
  pnl: UnrealizedPnL | null | undefined;
}): PredictHomepageUnrealizedPnlRowState {
  const { hasPositions, privacyMode, isPnlLoading, pnl } = input;

  if (!hasPositions || privacyMode) {
    return { show: false, isLoading: false, tone: 'neutral' };
  }
  if (isPnlLoading) {
    return { show: true, isLoading: true, tone: 'neutral' };
  }
  if (!pnl) {
    return { show: false, isLoading: false, tone: 'neutral' };
  }

  const cashUpnl = pnl.cashUpnl ?? 0;
  const valueText = strings(
    'predict.unrealized_pnl_value',
    formatPredictUnrealizedPnLStringParts({
      cashUpnl,
      percentUpnl: pnl.percentUpnl ?? 0,
    }),
  );

  return {
    show: true,
    isLoading: false,
    valueText,
    tone: cashUpnl > 0 ? 'positive' : cashUpnl < 0 ? 'negative' : 'neutral',
  };
}
