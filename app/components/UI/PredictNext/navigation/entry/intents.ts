import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import type { PredictEntryPoint as LegacyPredictEntryPoint } from '../../../Predict/types/navigation';
import type { PredictCampaign } from '../../campaigns/campaignVenues';
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
 * routes, route params or a Venue. A caller that is tied to one Venue says so
 * through Predict-owned context instead (`campaign`, an `eventRef`), and the
 * intent opens nothing while another Venue is active.
 */
export type PredictIntent =
  | {
      type: 'home';
      entryPoint?: PredictEntryPoint;
      /** Active A/B test assignments to attribute downstream trades to. */
      transactionActiveAbTests?: TransactionActiveAbTestEntry[];
      /**
       * The Rewards campaign that opens Predict. It scopes the intent to the
       * campaign's Venue: unavailable while another Venue is active, or while
       * the Active Venue is resolving.
       */
      campaign?: PredictCampaign;
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
      /** Image to show while the Event loads, where the screen supports it. */
      imageSnapshot?: string;
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
