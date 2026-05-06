import { renderHook } from '@testing-library/react-hooks';
import { usePerpsTradingCampaignEndedOutcomeToast } from './usePerpsTradingCampaignEndedOutcomeToast';
import { useCampaignOutcomeToast } from './useCampaignOutcomeToast';
import { usePerpsTradingCampaignParticipantOutcome } from './usePerpsTradingCampaignParticipantOutcome';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('./useCampaignOutcomeToast', () => ({
  useCampaignOutcomeToast: jest.fn(),
}));

jest.mock('./usePerpsTradingCampaignParticipantOutcome', () => ({
  usePerpsTradingCampaignParticipantOutcome: jest.fn(),
}));

const mockUseCampaignOutcomeToast =
  useCampaignOutcomeToast as jest.MockedFunction<
    typeof useCampaignOutcomeToast
  >;

const CAMPAIGN_ID = 'campaign-xyz';
const CAMPAIGN_NAME = 'Perps Campaign';

const makeCampaign = (id = CAMPAIGN_ID, name = CAMPAIGN_NAME): CampaignDto => ({
  id,
  name,
  type: CampaignType.PERPS_TRADING,
  endDate: '2025-01-01',
  startDate: '2024-01-01',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: false,
  showUpcomingDate: false,
});

describe('usePerpsTradingCampaignEndedOutcomeToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useCampaignOutcomeToast with PERPS_TRADING campaign type', () => {
    renderHook(() => usePerpsTradingCampaignEndedOutcomeToast());
    expect(mockUseCampaignOutcomeToast).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignType: CampaignType.PERPS_TRADING,
      }),
    );
  });

  it('passes usePerpsTradingCampaignParticipantOutcome as the useOutcome function', () => {
    renderHook(() => usePerpsTradingCampaignEndedOutcomeToast());
    expect(mockUseCampaignOutcomeToast).toHaveBeenCalledWith(
      expect.objectContaining({
        useOutcome: usePerpsTradingCampaignParticipantOutcome,
      }),
    );
  });

  it('getWinnerNavigation returns Perps winning view route with campaignId and campaignName', () => {
    renderHook(() => usePerpsTradingCampaignEndedOutcomeToast());
    const { getWinnerNavigation } =
      mockUseCampaignOutcomeToast.mock.calls[0][0];
    const nav = getWinnerNavigation(makeCampaign());
    expect(nav).toEqual({
      route: Routes.REWARDS_PERPS_TRADING_CAMPAIGN_WINNING_VIEW,
      params: { campaignId: CAMPAIGN_ID, campaignName: CAMPAIGN_NAME },
    });
  });

  it('getWinnerNavigation uses empty string for campaignName when name is null', () => {
    renderHook(() => usePerpsTradingCampaignEndedOutcomeToast());
    const { getWinnerNavigation } =
      mockUseCampaignOutcomeToast.mock.calls[0][0];
    const nav = getWinnerNavigation({
      ...makeCampaign(),
      name: null as unknown as string,
    });
    expect(nav.params).toEqual({
      campaignId: CAMPAIGN_ID,
      campaignName: '',
    });
  });

  it('getNonWinnerNavigation returns Perps details view route', () => {
    renderHook(() => usePerpsTradingCampaignEndedOutcomeToast());
    const { getNonWinnerNavigation } =
      mockUseCampaignOutcomeToast.mock.calls[0][0];
    const nav = getNonWinnerNavigation(makeCampaign());
    expect(nav).toEqual({
      route: Routes.REWARDS_PERPS_TRADING_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId: CAMPAIGN_ID },
    });
  });
});
