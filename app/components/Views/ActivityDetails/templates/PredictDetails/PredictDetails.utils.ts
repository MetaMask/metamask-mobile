import { strings } from '../../../../../../locales/i18n';
import type {
  ActivityListItem,
  PredictSettlementExtras,
} from '../../../../../util/activity-adapters';
import { formatPredictDate } from './PredictDetails.types';
import type { ActivityDetailsStep } from '../../components';

const POLYMARKET_BASE_URL = 'https://polymarket.com';

export type PredictSettlementOutcome = 'won' | 'lost' | 'partial';

/**
 * Whether the held side won. A `scalar` result pays a fraction per share to
 * both sides, so it is neither a win nor a loss.
 */
export function getPredictSettlementOutcome(
  side: PredictSettlementExtras['side'],
  result: PredictSettlementExtras['result'],
): PredictSettlementOutcome {
  if (result === 'scalar') {
    return 'partial';
  }
  return side === result ? 'won' : 'lost';
}

function getPredictFundsStepLabels() {
  return [
    strings('predict.transactions.steps.bridge_funds'),
    strings('predict.transactions.steps.add_funds'),
  ];
}

export function getPolymarketActivityUrl(activity?: {
  providerId?: string;
  eventSlug?: string;
  slug?: string;
}): string | undefined {
  // Only Polymarket has a public web URL today. Guard on providerId so other
  // providers don't get sent to a wrong (Polymarket) destination.
  if (activity?.providerId !== 'polymarket') {
    return undefined;
  }
  const slug = activity?.eventSlug ?? activity?.slug;
  return slug
    ? `${POLYMARKET_BASE_URL}/event/${encodeURIComponent(slug)}`
    : POLYMARKET_BASE_URL;
}

export function getPredictFundsSteps(
  status: ActivityListItem['status'],
  timestamp: number,
): ActivityDetailsStep[] {
  const labels = getPredictFundsStepLabels();
  const completedTimestamp = formatPredictDate(timestamp);

  if (status === 'success') {
    return labels.map((label) => ({
      label,
      subtext: completedTimestamp,
      status: 'completed',
    }));
  }

  return labels.map((label, index) => {
    const isTerminal = index === labels.length - 1;
    if (!isTerminal) {
      return { label, subtext: completedTimestamp, status: 'completed' };
    }

    return {
      label,
      subtext:
        status === 'failed'
          ? strings('transaction.failed')
          : strings('transaction.pending'),
      status: status === 'failed' ? 'failed' : 'pending',
    };
  });
}

export function getPredictFundsStepTitle(
  status: ActivityListItem['status'],
  completedCount: number,
  totalSteps: number,
) {
  if (status === 'success') {
    return strings('predict.transactions.steps.title_completed', {
      completed: totalSteps,
    });
  }

  if (status === 'failed') {
    return strings('predict.transactions.steps.title_failed', {
      completed: completedCount,
      failed: totalSteps - completedCount,
    });
  }

  return strings('predict.transactions.steps.title_pending', {
    completed: completedCount,
    pending: totalSteps - completedCount,
  });
}
