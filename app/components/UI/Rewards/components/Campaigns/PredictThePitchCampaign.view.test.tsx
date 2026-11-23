/**
 * Predict The Pitch's Predict entry points against the real PredictNext entry
 * actions and Active Venue: Polymarket parity, and no navigation at all while
 * Kalshi is the Active Venue.
 */
import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  renderScreenWithRoutes,
} from '../../../../../../tests/component-view/render';
import { initialStatePredictNext } from '../../../../../../tests/component-view/presets/predictNext';
import Routes from '../../../../../constants/navigation/Routes';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import {
  CampaignType,
  type CampaignDto,
  type PredictThePitchPositionDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import { CAMPAIGN_CTA_TEST_IDS } from './CampaignOptInCta';
import PredictThePitchCampaignCTA from './PredictThePitchCampaignCTA';
import {
  PREDICT_THE_PITCH_POSITION_ROW_TEST_ID,
  PredictThePitchOpenPositionRow,
} from './PredictThePitchPositionRows';

const CAMPAIGN_ROUTE = 'PredictThePitchCampaignProbe';
const ROW_TEST_ID = `${PREDICT_THE_PITCH_POSITION_ROW_TEST_ID}-0`;

/** The legacy lane: Polymarket is the Active Venue. */
const POLYMARKET_ACTIVE = {
  enabled: false,
  venues: { polymarket: { enabled: true }, kalshi: { enabled: true } },
  venueSelection: { enabled: false },
};

/** Kalshi rolled out alone: Kalshi is the Active Venue. */
const KALSHI_ACTIVE = {
  enabled: true,
  venues: { polymarket: { enabled: false }, kalshi: { enabled: true } },
  venueSelection: { enabled: false },
};

const CAMPAIGN: CampaignDto = {
  id: 'predict-campaign-1',
  type: CampaignType.PREDICT_THE_PITCH,
  name: 'Predict The Pitch',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2099-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  showUpcomingDate: false,
};

/** A position as the Rewards backend returns it, with a Polymarket event id. */
const POSITION: PredictThePitchPositionDto = {
  outcomeAssetId: 'token-1',
  outcomeAsset: 'Yes',
  conditionId: 'condition-1',
  conditionName: 'Match winner',
  conditionSlug: 'match-winner',
  eventId: '16167',
  eventSlug: 'world-cup-final',
  iconUrl: 'https://example.com/icon.png',
  capitalDeployed: 12,
  pnl: 3,
  roi: 0.25,
  status: 'open',
  fillShares: 10,
  fillSharesBought: 10,
  fillSharesSold: 0,
  fillPrice: 0.5,
  fillDate: '2025-01-01T00:00:00.000Z',
};

/** An opted-in participant's campaign screen: the CTA and one position. */
const CampaignProbe = () => (
  <>
    <PredictThePitchCampaignCTA
      campaign={CAMPAIGN}
      participantStatus={{
        status: { optedIn: true, participantCount: 1 },
        isLoading: false,
      }}
    />
    <PredictThePitchOpenPositionRow position={POSITION} index={0} />
  </>
);

const renderCampaign = (predictConfig: typeof POLYMARKET_ACTIVE) =>
  renderScreenWithRoutes(
    CampaignProbe,
    { name: CAMPAIGN_ROUTE },
    [
      {
        name: Routes.PREDICT.ROOT,
        Component: createRouteParamsProbe(Routes.PREDICT.ROOT),
      },
      {
        name: Routes.PREDICT.MODALS.ROOT,
        Component: createRouteParamsProbe(Routes.PREDICT.MODALS.ROOT),
      },
    ],
    {
      state: initialStatePredictNext()
        .withRemoteFeatureFlags({ predictConfig })
        .withOverrides({
          engine: {
            backgroundState: {
              PredictController: {
                eligibility: { status: 'eligible', country: 'PT' },
              },
            },
          },
        } as unknown as DeepPartial<RootState>)
        .build(),
    },
  );

type View = ReturnType<typeof renderCampaign>;

const readPredictRouteParams = async (view: View) =>
  JSON.parse(
    String(
      (await view.findByTestId(getRouteParamsProbeTestId(Routes.PREDICT.ROOT)))
        .props.children,
    ),
  );

const expectNoPredictRoute = (view: View) => {
  expect(
    view.queryByTestId(getRouteParamsProbeTestId(Routes.PREDICT.ROOT)),
  ).not.toBeOnTheScreen();
  expect(
    view.queryByTestId(getRouteParamsProbeTestId(Routes.PREDICT.MODALS.ROOT)),
  ).not.toBeOnTheScreen();
};

describe('Predict The Pitch campaign Predict entry points', () => {
  describe('while Polymarket is the Active Venue', () => {
    it('opens Predict Home with Rewards attribution from Predict now', async () => {
      const view = renderCampaign(POLYMARKET_ACTIVE);

      fireEvent.press(view.getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

      expect(await readPredictRouteParams(view)).toStrictEqual({
        screen: Routes.PREDICT.MARKET_LIST,
        params: { entryPoint: 'rewards' },
      });
    });

    it('opens the position market with Rewards attribution and the title and image snapshots', async () => {
      const view = renderCampaign(POLYMARKET_ACTIVE);

      fireEvent.press(view.getByTestId(ROW_TEST_ID));

      expect(await readPredictRouteParams(view)).toStrictEqual({
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: POSITION.eventId,
          providerId: 'polymarket',
          entryPoint: 'rewards',
          title: POSITION.conditionName,
          image: POSITION.iconUrl,
        },
      });
    });
  });

  describe('while Kalshi is the Active Venue', () => {
    it('navigates nowhere when the position row is pressed, and the row is no button', () => {
      const view = renderCampaign(KALSHI_ACTIVE);

      fireEvent.press(view.getByTestId(ROW_TEST_ID));

      expectNoPredictRoute(view);
      expect(view.getByText(POSITION.conditionName)).toBeOnTheScreen();
      expect(view.getByTestId(ROW_TEST_ID)).not.toHaveProp('accessibilityRole');
      expect(
        view.queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('removes both actions when Kalshi becomes the Active Venue mid-session, and navigates nowhere', () => {
      const engine = Engine as unknown as { state: Record<string, unknown> };
      const originalEngineState = engine.state;
      const view = renderCampaign(POLYMARKET_ACTIVE);
      expect(
        view.getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON),
      ).toBeOnTheScreen();

      try {
        act(() => {
          const flags =
            view.store.getState().engine.backgroundState
              .RemoteFeatureFlagController;
          engine.state = {
            ...engine.state,
            RemoteFeatureFlagController: {
              ...flags,
              remoteFeatureFlags: {
                ...flags.remoteFeatureFlags,
                predictConfig: KALSHI_ACTIVE,
              },
            },
          };
          view.store.dispatch(
            updateBgState({ key: 'RemoteFeatureFlagController' }),
          );
        });
        fireEvent.press(view.getByTestId(ROW_TEST_ID));

        expect(
          view.queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON),
        ).not.toBeOnTheScreen();
        expect(view.getByTestId(ROW_TEST_ID)).not.toHaveProp(
          'accessibilityRole',
        );
        expectNoPredictRoute(view);
      } finally {
        engine.state = originalEngineState;
      }
    });
  });
});
