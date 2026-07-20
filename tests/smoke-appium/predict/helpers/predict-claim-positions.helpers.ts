import Assertions from '../../../framework/Assertions.js';
import {
  remoteFeatureFlagPredictEnabled,
  remoteFeatureFlagHomepageSectionsV1Enabled,
  confirmationFeatureFlags,
} from '../../../api-mocking/mock-responses/feature-flags-mocks.js';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS,
  POLYMARKET_TRANSACTION_SENTINEL_MOCKS,
  POLYMARKET_UPDATE_USDC_BALANCE_MOCKS,
  POLYMARKET_ADD_CLAIMED_POSITIONS_TO_ACTIVITY_MOCKS,
} from '../../../api-mocking/mock-responses/polymarket/polymarket-mocks.js';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import {
  POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE,
  POLYMARKET_WINNING_POSITIONS_RESPONSE,
} from '../../../api-mocking/mock-responses/polymarket/polymarket-positions-response.js';
import { remoteFeatureFlagPerpsDisabledForPredictSmoke } from './predict-helpers.js';

export const claimPositions = {
  Open: 'Spurs vs. Pelicans',
  Lost: 'Commanders vs. Cowboys',
  Won: 'Blue Jays vs. Mariners',
} as const;

export const predictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPerpsDisabledForPredictSmoke(),
    ...remoteFeatureFlagPredictEnabled(true),
    ...remoteFeatureFlagHomepageSectionsV1Enabled(),
    ...Object.assign({}, ...confirmationFeatureFlags),
    carouselBanners: false,
    predictExtendedSportsMarkets: {
      versions: {
        '7.82.0': {
          enabled: false,
          leagues: [],
          enabledSportsMarketTypes: [],
        },
      },
    },
  });
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await POLYMARKET_TRANSACTION_SENTINEL_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, true);
};

export const predictionMarketFeatureForMarketDetails = async (
  mockServer: Mockttp,
) => {
  await predictionMarketFeature(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, true, {
    showWinningsAsActive: true,
  });
};

export const postClaimMocks = async (mockServer: Mockttp) => {
  await POLYMARKET_UPDATE_USDC_BALANCE_MOCKS(mockServer, 'claim');
  await POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS(mockServer);
  await POLYMARKET_ADD_CLAIMED_POSITIONS_TO_ACTIVITY_MOCKS(mockServer);
};

export const verifyResolvedPositionsRemoved = async () => {
  const allResolvedPositions = [
    ...POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE,
    ...POLYMARKET_WINNING_POSITIONS_RESPONSE,
  ];

  for (const position of allResolvedPositions) {
    await Assertions.expectTextNotDisplayed(position.title, {
      description: `Resolved position "${position.title}" should not be visible after claiming`,
    });
  }
};
