import Routes from '../../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../../reducers';
import {
  selectPredictHomeCategoriesConfig,
  selectPredictHomeRedesignEnabledFlag,
} from '../../../../Predict/selectors/featureFlags';
import {
  resolveVenueImplementation,
  selectActiveVenue,
  type PredictImplementationResolution,
} from '../../../implementation';
import type { LegacyLinkFeedContext } from '../internal/legacy/resolveLegacyIntent';
import { resolvePredictIntent, servesVenue } from '../resolvePredictIntent';
import {
  toAppNavigation,
  type PredictAppNavigation,
  type PredictIntentUnavailableReason,
} from '../targets';
import type { PredictLink } from './parsePredictLink';

/**
 * How long a link waits for the Active Venue. The Venue controller latches
 * a default within 3 s of Engine start; past this a link stops waiting.
 */
export const PREDICT_LINK_VENUE_WAIT_MS = 5_000;

/**
 * Where a link lands when it names nothing the Active Venue can open: the
 * Predict "Market unavailable" sheet, over whatever was on screen. Never
 * another Event, a feed, Home or another Venue.
 */
export const PREDICT_LINK_NOT_FOUND: PredictAppNavigation = {
  routeName: Routes.PREDICT.MODALS.ROOT,
  params: { screen: Routes.PREDICT.MODALS.MARKET_UNAVAILABLE },
};

export type PredictLinkResolution =
  | { status: 'ready'; navigation: PredictAppNavigation }
  | {
      status: 'notFound';
      reason: PredictIntentUnavailableReason;
      navigation: PredictAppNavigation;
    };

const notFound = (
  reason: PredictIntentUnavailableReason,
): PredictLinkResolution => ({
  status: 'notFound',
  reason,
  navigation: PREDICT_LINK_NOT_FOUND,
});

/**
 * Resolves a parsed link against the implementation serving the Active
 * Venue. A link marked for another Venue is not found: it is never opened
 * on the Active Venue, and its identifier is never looked up anywhere.
 */
export const resolvePredictLink = (
  link: PredictLink,
  implementation: PredictImplementationResolution,
  legacyLinkFeeds?: LegacyLinkFeedContext,
): PredictLinkResolution => {
  if (!link.intent) {
    return notFound('notFound');
  }
  if (link.venue !== null) {
    if (implementation.status === 'resolving') {
      return notFound('resolving');
    }
    if (!servesVenue(implementation, link.venue)) {
      return notFound('venueMismatch');
    }
  }
  const resolution = resolvePredictIntent(
    link.intent,
    implementation,
    legacyLinkFeeds,
  );
  return resolution.status === 'ready'
    ? { status: 'ready', navigation: toAppNavigation(resolution.target) }
    : notFound(resolution.reason);
};

/**
 * The legacy flags a V1 list link depends on. As before intents, an
 * unreadable flag means the redesign is off and the bundled categories apply.
 */
const readLegacyLinkFeeds = (state: RootState): LegacyLinkFeedContext => {
  const read = <T>(select: (rootState: RootState) => T): T | undefined => {
    try {
      return select(state);
    } catch {
      return undefined;
    }
  };
  return {
    homeRedesignEnabled: read(selectPredictHomeRedesignEnabledFlag) ?? false,
    homeCategories: read(selectPredictHomeCategoriesConfig),
  };
};

export interface PredictLinkStore {
  getState: () => RootState;
  subscribe: (listener: () => void) => () => void;
}

/**
 * Waits, at most `timeoutMs`, for the Active Venue to resolve, and returns
 * the implementation serving it, still `resolving` on timeout.
 */
const waitForImplementation = (
  store: PredictLinkStore,
  timeoutMs: number,
): Promise<PredictImplementationResolution> => {
  const read = () =>
    resolveVenueImplementation(selectActiveVenue(store.getState()));
  const current = read();
  if (current.status === 'ready') {
    return Promise.resolve(current);
  }
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe: () => void = () => undefined;
    const timeout: { id?: ReturnType<typeof setTimeout> } = {};
    const finish = (result: PredictImplementationResolution) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout.id);
      unsubscribe();
      resolve(result);
    };
    timeout.id = setTimeout(() => finish(read()), timeoutMs);
    unsubscribe = store.subscribe(() => {
      const next = read();
      if (next.status === 'ready') {
        finish(next);
      }
    });
  });
};

/**
 * Resolves a parsed link against the store's Active Venue, waiting a
 * bounded time while it resolves, so a cold-start link neither guesses
 * the Venue nor hangs.
 */
export const resolvePredictLinkFromStore = async (
  link: PredictLink,
  store: PredictLinkStore,
  timeoutMs = PREDICT_LINK_VENUE_WAIT_MS,
): Promise<PredictLinkResolution> => {
  const implementation = await waitForImplementation(store, timeoutMs);
  return resolvePredictLink(
    link,
    implementation,
    readLegacyLinkFeeds(store.getState()),
  );
};
