import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PredictThePitchCampaignCTA from './PredictThePitchCampaignCTA';
import { CAMPAIGN_CTA_TEST_IDS } from './CampaignOptInCta';
import {
  CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

const mockOpenPredict = jest.fn();
const mockCanOpenPredict = jest.fn();
let mockIsPredictEligible = true;
let mockIsPredictAvailable = true;

jest.mock('../../../PredictNext', () => ({
  PredictEventValues: { ENTRY_POINT: { REWARDS: 'rewards' } },
  usePredictAvailability: () => mockIsPredictAvailable,
  usePredictCampaignEligibility: (campaign: string) =>
    campaign === 'predict-the-pitch' && mockIsPredictEligible,
  usePredictEntryActions: () => ({
    openPredict: mockOpenPredict,
    canOpenPredict: mockCanOpenPredict,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (..._args: unknown[]) => ({}) }),
}));

jest.mock('../../hooks/useCampaignGeoRestriction', () => ({
  __esModule: true,
  default: (
    _campaign: unknown,
    _customRestrictedCountries: unknown,
    isFeatureGeoRestricted?: boolean,
  ) => ({
    isGeoRestricted: isFeatureGeoRestricted === true,
    isGeoLoading: false,
  }),
}));

const mockShowToast = jest.fn();
const mockEntriesClosed = jest.fn(() => ({ variant: 'icon' }));

jest.mock('../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      entriesClosed: mockEntriesClosed,
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
      'rewards.campaign.geo_locked_cta': 'Check eligibility',
      'rewards.campaign.geo_locked_toast_title': 'Not available in your region',
      'rewards.campaign.geo_locked_toast_description':
        "This campaign isn't available where you are. Check back later for new campaigns.",
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
    mockIsPredictEligible = true;
    mockIsPredictAvailable = true;
    mockCanOpenPredict.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens Predict Home for the campaign when the active campaign participant is opted in', () => {
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

    const predictNowIntent = {
      type: 'home',
      entryPoint: 'rewards',
      campaign: 'predict-the-pitch',
    };
    expect(mockCanOpenPredict).toHaveBeenCalledWith(predictNowIntent);
    expect(mockOpenPredict).toHaveBeenCalledTimes(1);
    expect(mockOpenPredict).toHaveBeenCalledWith(predictNowIntent);
  });

  it.each([
    ['the campaign Venue is not active', true, false],
    ['Predict is unavailable', false, true],
  ])(
    'renders no CTA for an opted-in participant when %s',
    (_case, isAvailable, canOpen) => {
      mockIsPredictAvailable = isAvailable;
      mockCanOpenPredict.mockReturnValue(canOpen);

      const { queryByTestId, queryByText } = render(
        <PredictThePitchCampaignCTA
          campaign={buildCampaign()}
          participantStatus={{
            status: { optedIn: true, participantCount: 1 },
            isLoading: false,
          }}
        />,
      );

      expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
      expect(queryByText('Predict now')).toBeNull();
      expect(mockOpenPredict).not.toHaveBeenCalled();
    },
  );

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
    expect(mockOpenPredict).not.toHaveBeenCalled();
  });

  it('shows the geo-locked CTA when predict is not eligible and the user is not opted in', () => {
    mockIsPredictEligible = false;

    const { getByTestId, getByText } = render(
      <PredictThePitchCampaignCTA
        campaign={buildCampaign()}
        participantStatus={{
          status: { optedIn: false, participantCount: 0 },
          isLoading: false,
        }}
      />,
    );

    expect(getByText('Check eligibility')).toBeOnTheScreen();
    fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

    expect(mockEntriesClosed).toHaveBeenCalledWith(
      'Not available in your region',
      "This campaign isn't available where you are. Check back later for new campaigns.",
    );
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockOpenPredict).not.toHaveBeenCalled();
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
