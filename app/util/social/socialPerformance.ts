import { v4 as uuidv4 } from 'uuid';
import type { HardwareTier, NetworkTier } from '../deviceCapability/types';
import { endTrace, trace, TraceName, TraceOperation } from '../trace';

export const SOCIAL_TRACE_FEATURE = 'social_v1' as const;

export const SOCIAL_TRACE_TABS = {
  Trending: 'trending',
  Following: 'following',
  Leaderboard: 'leaderboard',
  LiveTrades: 'live_trades',
} as const;

export type SocialTraceTab =
  (typeof SOCIAL_TRACE_TABS)[keyof typeof SOCIAL_TRACE_TABS];

export type SocialDataFetchTab = Exclude<SocialTraceTab, 'live_trades'>;
export type SocialCacheState = 'cold' | 'warm';
export type SocialContentState = 'content' | 'empty' | 'error';

export interface SocialPerformanceContext {
  enabled: boolean;
  hardwareTier: HardwareTier | null;
  isActive: boolean;
  isFocused: boolean;
  networkTier: NetworkTier | null;
}

const HARDWARE_TIER_TAGS = {
  LOW: 'low',
  MID: 'mid',
  HIGH: 'high',
} as const satisfies Record<HardwareTier, 'low' | 'mid' | 'high'>;

const NETWORK_TIER_TAGS = {
  NONE: 'none',
  SLOW_CELLULAR: 'slow_cellular',
  FAST_CELLULAR: 'fast_cellular',
  WIFI: 'wifi',
} as const satisfies Record<
  NetworkTier,
  'none' | 'slow_cellular' | 'fast_cellular' | 'wifi'
>;

export const getSocialHardwareTierTag = (hardwareTier: HardwareTier | null) =>
  hardwareTier === null ? 'unknown' : HARDWARE_TIER_TAGS[hardwareTier];

export const getSocialNetworkTierTag = (networkTier: NetworkTier | null) =>
  networkTier === null ? 'unknown' : NETWORK_TIER_TAGS[networkTier];

interface MeasureSocialDataFetchOptions {
  cacheState: SocialCacheState;
  request: () => Promise<unknown>;
  tab: SocialDataFetchTab;
}

/**
 * Measures one real Social V1 request without attaching request data or errors.
 *
 * @param options - Bounded trace context and the existing request callback.
 * @returns The original request result.
 */
export const measureSocialDataFetch = async <Result>({
  cacheState,
  request,
  tab,
}: Omit<MeasureSocialDataFetchOptions, 'request'> & {
  request: () => Promise<Result>;
}): Promise<Result> => {
  const id = uuidv4();
  trace({
    name: TraceName.SocialTabDataFetch,
    op: TraceOperation.SocialDataFetch,
    id,
    tags: {
      feature: SOCIAL_TRACE_FEATURE,
      tab,
      cache_state: cacheState,
    },
  });

  try {
    const result = await request();
    endTrace({
      name: TraceName.SocialTabDataFetch,
      id,
      status: 'ok',
      data: { success: true },
    });
    return result;
  } catch (error) {
    endTrace({
      name: TraceName.SocialTabDataFetch,
      id,
      status: 'error',
      data: {
        success: false,
        content_state: 'error',
      },
    });
    throw error;
  }
};
