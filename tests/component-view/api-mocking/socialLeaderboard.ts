/**
 * Social Leaderboard API mock for component view tests.
 *
 * Intercepts Engine.controllerMessenger.call for:
 * - SocialService:fetchLeaderboard (the useTopTraders React Query source)
 * - AuthenticatedUserStorageService:getNotificationPreferences (useNotificationPreferences)
 *
 * Uses the same spy/restore pattern as api-mocking/watchlist.ts.
 */

import Engine from '../../../app/core/Engine';
import { DEFAULT_SOCIAL_AI_PREFERENCES } from '@metamask/notification-services-controller/notification-services';

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

/**
 * Raw API response shape for a single leaderboard entry
 * (matches the LeaderboardResponse.traders[] element from @metamask/social-controllers).
 */
export interface MockLeaderboardEntry {
  profileId: string;
  addresses: string[];
  rank: number;
  name: string;
  imageUrl?: string | null;
  roiPercent7d: number;
  roiPercent30d: number;
  pnl7d: number;
  pnl30d: number;
  winRate7d: number;
  winRate30d: number;
  pnlPerChain: Record<string, number>;
  followerCount: number;
}

/**
 * Three fixture traders that exercise all rendering paths:
 * - trader-1 / alpha.eth: spot chains (base, ethereum) – gold podium medal
 * - trader-2 / beta.eth: spot chain (base) – silver podium medal
 * - trader-3 / gamma.eth: hyperliquid (perps-only) – bronze podium medal
 *
 * Metric ordering:
 * PnL 7d: alpha > beta > gamma (default sort)
 * ROI 7d: gamma > beta > alpha (ROI sort flips order)
 * Win rate 7d: alpha > beta > gamma
 */
export const mockLeaderboardTraders: MockLeaderboardEntry[] = [
  {
    profileId: 'trader-1',
    addresses: ['0x0000000000000000000000000000000000000001'],
    rank: 1,
    name: 'alpha.eth',
    imageUrl: 'https://example.com/avatar1.png',
    roiPercent7d: 43,
    roiPercent30d: 55,
    pnl7d: 963146.8,
    pnl30d: 1_200_000,
    winRate7d: 0.92,
    winRate30d: 0.88,
    pnlPerChain: { base: 500_000, ethereum: 463_146.8 },
    followerCount: 48_707,
  },
  {
    profileId: 'trader-2',
    addresses: ['0x0000000000000000000000000000000000000002'],
    rank: 2,
    name: 'beta.eth',
    imageUrl: 'https://example.com/avatar2.png',
    roiPercent7d: 359,
    roiPercent30d: 420,
    pnl7d: 474_751.45,
    pnl30d: 600_000,
    winRate7d: 0.61,
    winRate30d: 0.58,
    pnlPerChain: { base: 474_751.45 },
    followerCount: 21_999,
  },
  {
    profileId: 'trader-3',
    addresses: ['0x0000000000000000000000000000000000000003'],
    rank: 3,
    name: 'gamma.eth',
    imageUrl: 'https://example.com/avatar3.png',
    roiPercent7d: 617,
    roiPercent30d: 750,
    pnl7d: 374_735.16,
    pnl30d: 450_000,
    winRate7d: 0.48,
    winRate30d: 0.52,
    pnlPerChain: { hyperliquid: 374_735.16 },
    followerCount: 11_772,
  },
];

/** Spot-only fixture subset (used when querying tokens tab). */
export const mockSpotTraders = mockLeaderboardTraders.slice(0, 2);

/** Perps-only fixture subset (used when querying perps tab). */
export const mockPerpsTraders = [mockLeaderboardTraders[2]];

// ---------------------------------------------------------------------------
// Notification preferences helpers
// ---------------------------------------------------------------------------

export interface NotificationPrefsOptions {
  /** Whether push notifications channel is on. Default: true. */
  pushEnabled?: boolean;
  /** Whether in-app notifications channel is on. Default: true. */
  inAppEnabled?: boolean;
  /** Trader IDs that are muted. Default: []. */
  mutedTraderProfileIds?: string[];
}

function buildNotificationPrefsResponse(opts: NotificationPrefsOptions = {}) {
  const {
    pushEnabled = true,
    inAppEnabled = true,
    mutedTraderProfileIds = [],
  } = opts;

  return {
    socialAI: {
      ...DEFAULT_SOCIAL_AI_PREFERENCES,
      pushNotificationsEnabled: pushEnabled,
      inAppNotificationsEnabled: inAppEnabled,
      mutedTraderProfileIds,
    },
  };
}

// ---------------------------------------------------------------------------
// Spy lifecycle
// ---------------------------------------------------------------------------

let messengerSpy: jest.SpyInstance | undefined;

/**
 * Options to configure the leaderboard API mock.
 * All overrides are optional; sane defaults cover the happy-path.
 */
export interface LeaderboardApiMockOptions {
  /** Custom trader set to return for the tokens tab (spot-only chains). */
  spotTraders?: MockLeaderboardEntry[];
  /** Custom trader set to return for the perps tab (hyperliquid). */
  perpsTraders?: MockLeaderboardEntry[];
  /** Custom trader set to return when all chains are requested. */
  allTraders?: MockLeaderboardEntry[];
  /** Override notification preferences returned by the AUS GET action. */
  notificationPrefs?: NotificationPrefsOptions;
}

const PERP_CHAIN = 'hyperliquid';

/**
 * Spies on Engine.controllerMessenger.call to intercept Social Leaderboard
 * messenger actions. Call this in `beforeEach`; call `clearLeaderboardApiMock`
 * in `afterEach`.
 *
 * Returns the spy so tests can inspect individual calls.
 */
export function setupLeaderboardApiMock(
  options: LeaderboardApiMockOptions = {},
): jest.SpyInstance {
  const {
    spotTraders = mockSpotTraders,
    perpsTraders = mockPerpsTraders,
    allTraders = mockLeaderboardTraders,
    notificationPrefs = {},
  } = options;

  const prefsResponse = buildNotificationPrefsResponse(notificationPrefs);

  const originalCall = Engine.controllerMessenger.call.bind(
    Engine.controllerMessenger,
  );

  clearLeaderboardApiMock();

  messengerSpy = jest
    .spyOn(Engine.controllerMessenger, 'call')
    .mockImplementation((...messengerArgs: [string, ...unknown[]]) => {
      const [action, fetchOpts] = messengerArgs as [
        string,
        { chains?: string[] } | undefined,
        ...unknown[],
      ];

      if (action === 'SocialService:fetchLeaderboard') {
        const chains = fetchOpts?.chains ?? [];
        const isPerpsOnly = chains.length === 1 && chains[0] === PERP_CHAIN;
        const isMixedWithPerps =
          chains.includes(PERP_CHAIN) && chains.length > 1;

        let traders: MockLeaderboardEntry[];
        if (isPerpsOnly) {
          traders = perpsTraders;
        } else if (isMixedWithPerps) {
          traders = allTraders;
        } else {
          traders = spotTraders;
        }

        return Promise.resolve({ traders }) as ReturnType<
          typeof Engine.controllerMessenger.call
        >;
      }

      if (
        action === 'AuthenticatedUserStorageService:getNotificationPreferences'
      ) {
        return Promise.resolve(prefsResponse) as ReturnType<
          typeof Engine.controllerMessenger.call
        >;
      }

      return Reflect.apply(
        originalCall,
        Engine.controllerMessenger,
        messengerArgs as Parameters<typeof Engine.controllerMessenger.call>,
      ) as ReturnType<typeof Engine.controllerMessenger.call>;
    });

  return messengerSpy;
}

/**
 * Restores the Engine.controllerMessenger.call spy installed by
 * `setupLeaderboardApiMock`. Call in `afterEach`.
 */
export function clearLeaderboardApiMock(): void {
  if (messengerSpy) {
    messengerSpy.mockRestore();
    messengerSpy = undefined;
  }
}

/**
 * Returns the active messenger spy (or throws if not set up).
 * Useful for asserting specific calls inside a test.
 */
export function getLeaderboardMessengerSpy(): jest.SpyInstance {
  if (!messengerSpy) {
    throw new Error(
      'getLeaderboardMessengerSpy: call setupLeaderboardApiMock first',
    );
  }
  return messengerSpy;
}
