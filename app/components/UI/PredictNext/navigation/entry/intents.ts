import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import type { PredictEntryPoint as LegacyPredictEntryPoint } from '../../../Predict/types/navigation';
import type { PredictEventRef } from './eventRef';

/** Analytics attribution for the surface that opened Predict. */
export type PredictEntryPoint = LegacyPredictEntryPoint;

/** A Predict feed a caller can open by name. */
export type PredictFeedCategory = 'trending' | 'sports' | 'crypto' | 'politics';

/** A Portfolio tab a caller can open. */
export type PredictPortfolioIntentTab = 'positions' | 'activity';

/**
 * Where a caller outside Predict wants to go. Intents are Venue-neutral:
 * Predict resolves each one against the Active Venue, so callers never pass
 * routes, route params or a Venue.
 */
export type PredictIntent =
  | {
      type: 'home';
      entryPoint?: PredictEntryPoint;
      /** Active A/B test assignments to attribute downstream trades to. */
      transactionActiveAbTests?: TransactionActiveAbTestEntry[];
    }
  | {
      type: 'feed';
      category: PredictFeedCategory;
      entryPoint?: PredictEntryPoint;
    }
  | {
      type: 'event';
      eventRef: PredictEventRef;
      entryPoint?: PredictEntryPoint;
      /** Title to show while the Event loads, where the screen supports it. */
      titleSnapshot?: string;
    }
  | {
      type: 'portfolio';
      tab?: PredictPortfolioIntentTab;
      entryPoint?: PredictEntryPoint;
    }
  | {
      /** Add funds to the Predict balance. */
      type: 'addFunds';
      /** Start the deposit at once instead of explaining it first. */
      autoDeposit?: boolean;
    };

export type PredictIntentType = PredictIntent['type'];
