import '../../../../../tests/component-view/mocks';
import React from 'react';
import { act } from '@testing-library/react-native';
import { renderComponentViewScreen } from '../../../../../tests/component-view/render';
import { initialStatePredict } from '../../../../../tests/component-view/presets/predict';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import {
  PredictPositionStatus,
  type PredictPosition,
} from '../../Predict/types';
import type { PredictConfig } from '../config/predictConfig';
import type { PredictVenueControllerState } from '../implementation/PredictVenueController';
import { PredictHomeSection } from '.';

const POSITION: PredictPosition = {
  amount: 10,
  avgPrice: 1,
  cashPnl: 4,
  claimable: false,
  currentValue: 24,
  endDate: '2026-12-01T00:00:00Z',
  icon: 'https://example.com/icon.png',
  id: 'france',
  initialValue: 20,
  marketId: 'market-france',
  outcome: 'Yes',
  outcomeId: 'outcome-france',
  outcomeIndex: 0,
  outcomeTokenId: 'token-france',
  percentPnl: 20,
  price: 1,
  providerId: 'polymarket',
  size: 10,
  status: PredictPositionStatus.OPEN,
  title: 'Will France win the 2026 FIFA World Cup?',
};

const LEGACY_LANE: PredictConfig = {
  enabled: false,
  venues: {
    polymarket: { enabled: false },
    kalshi: { enabled: false },
  },
  venueSelection: { enabled: false },
};

const rollout = (venues: {
  polymarket: boolean;
  kalshi: boolean;
}): PredictConfig => ({
  enabled: true,
  venues: {
    polymarket: { enabled: venues.polymarket },
    kalshi: { enabled: venues.kalshi },
  },
  venueSelection: { enabled: venues.polymarket && venues.kalshi },
});

const HomeSectionProbe = () => (
  <PredictHomeSection sectionIndex={0} totalSectionsLoaded={1} />
);

const renderSection = ({
  predictConfig,
  venueSelectionPreference = null,
}: {
  predictConfig: PredictConfig;
  venueSelectionPreference?: PredictVenueControllerState['venueSelectionPreference'];
}) =>
  renderComponentViewScreen(
    HomeSectionProbe,
    { name: 'PredictHomeSectionProbe' },
    {
      state: initialStatePredict()
        .withRemoteFeatureFlags({ predictConfig })
        .withOverrides({
          engine: {
            backgroundState: {
              PredictVenueController: {
                venueSelectionPreference,
                lastActiveVenue: null,
                sessionDefault: null,
              },
            },
          },
        })
        .build(),
    },
  );

const engine = Engine as unknown as { state: Record<string, unknown> };
const originalEngineState = engine.state;
const getPositions = Engine.context.PredictController.getPositions as jest.Mock;

/** Publishes a new Venue Selection Preference to Redux, as the Engine does. */
const selectVenue = (
  view: ReturnType<typeof renderSection>,
  venue: 'polymarket' | 'kalshi',
) => {
  act(() => {
    engine.state = {
      ...engine.state,
      PredictVenueController: {
        ...view.store.getState().engine.backgroundState.PredictVenueController,
        venueSelectionPreference: venue,
      },
    };
    view.store.dispatch(updateBgState({ key: 'PredictVenueController' }));
  });
};

describe('PredictHomeSection', () => {
  beforeEach(() => {
    getPositions.mockClear();
    getPositions.mockResolvedValue([POSITION]);
  });

  afterEach(() => {
    engine.state = originalEngineState;
  });

  it.each([
    ['the legacy lane', LEGACY_LANE],
    ['a Polymarket-only rollout', rollout({ polymarket: true, kalshi: false })],
  ])(
    'renders the Polymarket section and its positions on %s',
    async (_, predictConfig) => {
      const view = renderSection({ predictConfig });

      expect(await view.findByText(POSITION.title)).toBeOnTheScreen();
      expect(view.getByText('Predictions')).toBeOnTheScreen();
      expect(getPositions).toHaveBeenCalled();
    },
  );

  it('renders nothing and never reads Polymarket positions for Kalshi', async () => {
    const view = renderSection({
      predictConfig: rollout({ polymarket: false, kalshi: true }),
    });

    await act(async () => undefined);

    expect(view.queryByText('Predictions')).not.toBeOnTheScreen();
    expect(view.queryByText(POSITION.title)).not.toBeOnTheScreen();
    expect(getPositions).not.toHaveBeenCalled();
  });

  it('unmounts on a change to Kalshi and remounts on the way back', async () => {
    const view = renderSection({
      predictConfig: rollout({ polymarket: true, kalshi: true }),
      venueSelectionPreference: 'polymarket',
    });
    expect(await view.findByText(POSITION.title)).toBeOnTheScreen();

    selectVenue(view, 'kalshi');

    expect(view.queryByText(POSITION.title)).not.toBeOnTheScreen();
    expect(view.queryByText('Predictions')).not.toBeOnTheScreen();

    selectVenue(view, 'polymarket');

    expect(await view.findByText(POSITION.title)).toBeOnTheScreen();
  });
});
