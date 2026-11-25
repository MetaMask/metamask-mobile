import '../mocks';
import React from 'react';
import Engine from '../../../app/core/Engine';
import PerpsTradingCampaignLeaderboardView from '../../../app/components/UI/Rewards/Views/PerpsTradingCampaignLeaderboardView';
import Routes from '../../../app/constants/navigation/Routes';
import { CampaignType } from '../../../app/core/Engine/controllers/rewards-controller/types';
import type {
  CampaignDto,
  PerpsTradingCampaignLeaderboardDto,
  PerpsTradingCampaignLeaderboardEntry,
} from '../../../app/core/Engine/controllers/rewards-controller/types';
import { createStateFixture } from '../stateFixture';
import { renderComponentViewScreen } from '../render';
import { initialState as rewardsInitialState } from '../../../app/reducers/rewards';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

export const LEADERBOARD_CAMPAIGN_ID = 'perps-fall-competition';

export function leaderboardEntry(
  rank: number,
  code: string,
): PerpsTradingCampaignLeaderboardEntry {
  return {
    rank,
    referralCode: code,
    pnl: 5000 - rank * 10,
    volume: 100_000 - rank * 100,
  };
}

export function perpsCampaignFixture(): CampaignDto {
  return {
    id: LEADERBOARD_CAMPAIGN_ID,
    type: CampaignType.PERPS_TRADING,
    name: 'Perps Fall Competition',
    startDate: '2026-10-01T00:00:00.000Z',
    endDate: '2027-12-31T23:59:59.000Z',
    termsAndConditions: null,
    excludedRegions: [],
    featured: false,
    details: { howItWorks: { title: '', description: '', steps: [] } },
  } as unknown as CampaignDto;
}

/** A dense board: `winners` crowned ranks plus `extraRows` below the prizes. */
export function leaderboardFixture(
  winners: number,
  extraRows = 0,
): PerpsTradingCampaignLeaderboardDto {
  const entries = Array.from({ length: winners + extraRows }, (_, index) =>
    leaderboardEntry(index + 1, `TRADER${String(index + 1).padStart(3, '0')}`),
  );
  return {
    campaignId: LEADERBOARD_CAMPAIGN_ID,
    computedAt: '2026-11-01T00:00:00.000Z',
    entries,
    totalParticipants: winners + extraRows + 25,
    minVolumeForEligibility: 25_000,
    numberOfWinners: winners,
  } as PerpsTradingCampaignLeaderboardDto;
}

export interface RenderPerpsLeaderboardOptions {
  overrides?: DeepPartial<RootState>;
  /** Leaderboard response the Engine serves. Defaults to a 30-winner board. */
  leaderboard?: PerpsTradingCampaignLeaderboardDto;
}

/**
 * Perps trading campaign leaderboard with real Redux. The leaderboard read is
 * an Engine call; the campaign comes from the rewards state.
 */
export function renderPerpsCampaignLeaderboard(
  options: RenderPerpsLeaderboardOptions = {},
) {
  const { leaderboard = leaderboardFixture(30) } = options;
  const engine = Engine.controllerMessenger.call as jest.Mock;
  const baseEngineCall = engine.getMockImplementation();
  engine.mockReset();
  engine.mockImplementation((action: string, ...args: unknown[]) => {
    if (action === 'RewardsController:getPerpsTradingCampaignLeaderboard') {
      return Promise.resolve(leaderboard);
    }
    if (baseEngineCall) {
      return baseEngineCall(action, ...args);
    }
    return Promise.resolve(undefined);
  });

  const state = createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({})
    .withOverrides({
      rewards: {
        ...rewardsInitialState,
        campaigns: [perpsCampaignFixture()],
        campaignsHasLoaded: true,
      },
      ...options.overrides,
    })
    .build();

  const screen = renderComponentViewScreen(
    PerpsTradingCampaignLeaderboardView as unknown as React.ComponentType,
    { name: Routes.REWARDS_PERPS_TRADING_CAMPAIGN_LEADERBOARD },
    { state },
    { campaignId: LEADERBOARD_CAMPAIGN_ID },
  );
  return { ...screen, engine };
}
