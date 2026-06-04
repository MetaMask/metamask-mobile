import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PredictThePitchCampaignCTA from './PredictThePitchCampaignCTA';
import { CAMPAIGN_CTA_TEST_IDS } from './CampaignOptInCta';
import {
  CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (..._args: unknown[]) => ({}) }),
}));

jest.mock('../../hooks/useCampaignGeoRestriction', () => ({
  __esModule: true,
  default: () => ({ isGeoRestricted: false, isGeoLoading: false }),
}));

jest.mock('../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: jest.fn(),
    RewardsToastOptions: {
      entriesClosed: jest.fn(),
    },
  }),
}));

jest.mock('./CampaignOptInSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'campaign-opt-in-sheet' }),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'rewards.predict_the_pitch_campaign.predict_now_cta': 'Predict now',
      'rewards.campaign_details.join_campaign': 'Join Campaign',
      'rewards.campaign.geo_loading': 'Checking eligibility',
    };
    return map[key] ?? key;
  },
}));

function buildCampaign(overrides: Partial<CampaignDto> = {}): CampaignDto {
  return {
    id: 'predict-campaign-1',
    type: CampaignType.PREDICT_THE_PITCH,
    name: 'Predict The Pitch',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2026-12-31T23:59:59.999Z',
    termsAndConditions: null,
    excludedRegions: [],
    details: null,
    featured: true,
    showUpcomingDate: false,
    ...overrides,
  };
}

describe('PredictThePitchCampaignCTA', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-15T12:00:00.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('navigates to Predict markets when the active campaign participant is opted in', () => {
    const { getByTestId, getByText } = render(
      <PredictThePitchCampaignCTA
        campaign={buildCampaign()}
        participantStatus={{
          status: { optedIn: true, participantCount: 1 },
          isLoading: false,
        }}
      />,
    );

    expect(getByText('Predict now')).toBeOnTheScreen();
    fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  });

  it('uses the generic opt-in CTA before the participant is opted in', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <PredictThePitchCampaignCTA
        campaign={buildCampaign()}
        participantStatus={{
          status: { optedIn: false, participantCount: 0 },
          isLoading: false,
        }}
      />,
    );

    expect(getByText('Join Campaign')).toBeOnTheScreen();
    expect(queryByTestId('campaign-opt-in-sheet')).toBeNull();

    fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

    expect(getByTestId('campaign-opt-in-sheet')).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders no CTA when the campaign is complete', () => {
    const { queryByTestId } = render(
      <PredictThePitchCampaignCTA
        campaign={buildCampaign({
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2025-01-01T00:00:00.000Z',
        })}
        participantStatus={{
          status: { optedIn: true, participantCount: 1 },
          isLoading: false,
        }}
      />,
    );

    expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
  });
});
