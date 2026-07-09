import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { store } from '../../../../store';
import type { RootState } from '../../../../reducers';
import { selectRewardsFirstPredictOnUsEnabled } from '../../../../selectors/featureFlagController/rewardsFirstPredictOnUs';
import { selectFirstPredictOnUsSplashShown } from '../../../../reducers/rewards/selectors';
import type {
  FirstPredictOnUsDto,
  PredictMarketRef,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import type { PredictMarket } from '../../Predict/types';

// ============================================================================
// Market resolution
// ============================================================================

/**
 * Narrow a resolved market to a single outcome (condition) when the backend
 * ref specifies a `conditionId`. Falls back to the market image when an
 * outcome image is missing. Returns null when the condition can't be matched.
 */
export function filterMarketToConditionId(
  market: PredictMarket,
  conditionId: string,
): PredictMarket | null {
  const outcomes = market.outcomes.filter(
    (outcome) => outcome.id === conditionId,
  );
  if (outcomes.length === 0) {
    return null;
  }

  return {
    ...market,
    outcomes: outcomes.map((outcome) => ({
      ...outcome,
      image: outcome.image || market.image,
    })),
  };
}

/**
 * Resolve a single backend market ref into a full Predict market via
 * `PredictController.getMarket`, applying condition filtering when present.
 */
export async function resolveMarketRef(
  ref: PredictMarketRef,
): Promise<PredictMarket | null> {
  const market = await Engine.context.PredictController.getMarket({
    marketId: ref.eventId,
  });

  if (!ref.conditionId) {
    return market;
  }

  return filterMarketToConditionId(market, ref.conditionId);
}

export interface ResolvedFirstPredictOnUsMarkets {
  markets: PredictMarket[];
  failedCount: number;
}

/**
 * Resolve every backend market ref concurrently. Individual failures are
 * tolerated: the resolved subset is returned alongside a `failedCount` so
 * callers can decide whether the result is usable.
 */
export async function resolveFirstPredictOnUsMarkets(
  refs: PredictMarketRef[],
): Promise<ResolvedFirstPredictOnUsMarkets> {
  if (refs.length === 0) {
    return { markets: [], failedCount: 0 };
  }

  const results = await Promise.allSettled(refs.map(resolveMarketRef));

  const markets: PredictMarket[] = [];
  let failedCount = 0;

  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      markets.push(result.value);
    } else {
      failedCount++;
    }
  });

  return { markets, failedCount };
}

// ============================================================================
// Launch gating
// ============================================================================

/**
 * Maximum time we spend resolving eligibility, content, and markets before
 * abandoning the launch. Keeps a hung network request from blocking onboarding.
 */
export const FIRST_PREDICT_ON_US_RESOLVE_TIMEOUT_MS = 5000;

export interface ResolvedFirstPredictOnUsLaunch {
  content: FirstPredictOnUsDto;
  markets: PredictMarket[];
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('First Predict On Us launch resolution timed out'));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });

/**
 * Read Predict geo eligibility, refreshing it first so onboarding decisions use
 * a fresh value rather than whatever happened to be cached.
 */
const resolveEligibility = async (): Promise<boolean> => {
  try {
    await Engine.context.PredictController.refreshEligibility();
  } catch (error) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'resolveFirstPredictOnUs: eligibility refresh failed',
    );
  }

  const eligibility = (store.getState() as RootState).engine.backgroundState
    .PredictController?.eligibility;

  return Boolean(eligibility?.eligible && eligibility?.country);
};

const resolve = async (): Promise<ResolvedFirstPredictOnUsLaunch | null> => {
  const state = store.getState() as RootState;

  // Static gates first: feature flag + one-time persisted guard.
  if (!selectRewardsFirstPredictOnUsEnabled(state)) {
    return null;
  }
  if (selectFirstPredictOnUsSplashShown(state)) {
    return null;
  }

  // Predict geo eligibility.
  const isEligible = await resolveEligibility();

  if (!isEligible) {
    return null;
  }

  // CMS content (1-minute cached in the controller).
  const content = (await Engine.controllerMessenger.call(
    'RewardsController:getFirstPredictOnUs',
  )) as FirstPredictOnUsDto | null;

  if (!content) {
    return null;
  }

  const refs = content.markets ?? [];
  if (refs.length === 0) {
    return null;
  }

  // Resolve the referenced Predict markets. Individual failures are tolerated;
  // we only require at least one usable market.
  const { markets } = await resolveFirstPredictOnUsMarkets(refs);

  if (markets.length === 0) {
    return null;
  }

  return { content, markets };
};

/**
 * Off-screen gating for the First Predict On Us onboarding splash.
 *
 * Runs all checks (feature flag, one-time guard, Predict geo eligibility, CMS
 * content, market resolution) before the splash is ever rendered, bounded by a
 * timeout. Returns the resolved content + markets when the splash should be
 * shown as an onboarding step, or `null` when it should be skipped.
 *
 * The caller is responsible for marking the persisted guard and navigating.
 */
export async function resolveFirstPredictOnUsLaunch(
  timeoutMs: number = FIRST_PREDICT_ON_US_RESOLVE_TIMEOUT_MS,
): Promise<ResolvedFirstPredictOnUsLaunch | null> {
  try {
    return await withTimeout(resolve(), timeoutMs);
  } catch (error) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'resolveFirstPredictOnUs: failed to resolve splash content',
    );
    return null;
  }
}
