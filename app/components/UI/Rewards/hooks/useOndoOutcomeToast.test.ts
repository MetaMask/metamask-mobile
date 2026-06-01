import { renderHook } from '@testing-library/react-hooks';
import { useOndoOutcomeToast } from './useOndoOutcomeToast';
import { useCampaignOutcomeToast } from './useCampaignOutcomeToast';
import { useOndoCampaignParticipantOutcome } from './useOndoCampaignParticipantOutcome';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('./useCampaignOutcomeToast', () => ({
  useCampaignOutcomeToast: jest.fn(),
}));

jest.mock('./useOndoCampaignParticipantOutcome', () => ({
  useOndoCampaignParticipantOutcome: jest.fn(),
}));

const mockUseCampaignOutcomeToast =
  useCampaignOutcomeToast as jest.MockedFunction<
    typeof useCampaignOutcomeToast
  >;

const CAMPAIGN_ID = 'campaign-123';
const CAMPAIGN_NAME = 'Ondo Campaign';

const makeCampaign = (id = CAMPAIGN_ID): CampaignDto => ({
  id,
  name: CAMPAIGN_NAME,
  type: CampaignType.ONDO_HOLDING,
  endDate: '2025-01-01',
  startDate: '2024-01-01',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: false,
  showUpcomingDate: false,
});

describe('useOndoOutcomeToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useCampaignOutcomeToast with ONDO_HOLDING campaign type', () => {
    renderHook(() => useOndoOutcomeToast());
    expect(mockUseCampaignOutcomeToast).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignType: CampaignType.ONDO_HOLDING,
      }),
    );
  });

  it('passes useOndoCampaignParticipantOutcome as the useOutcome function', () => {
    renderHook(() => useOndoOutcomeToast());
    expect(mockUseCampaignOutcomeToast).toHaveBeenCalledWith(
      expect.objectContaining({
        useOutcome: useOndoCampaignParticipantOutcome,
      }),
    );
  });

  it('getWinnerNavigation returns ONDO winning view route with campaignId and campaignName', () => {
    renderHook(() => useOndoOutcomeToast());
    const { getWinnerNavigation } =
      mockUseCampaignOutcomeToast.mock.calls[0][0];
    const nav = getWinnerNavigation(makeCampaign());
    expect(nav).toEqual({
      route: Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW,
      params: { campaignId: CAMPAIGN_ID, campaignName: CAMPAIGN_NAME },
    });
  });

  it('getWinnerNavigation uses empty string for campaignName when name is null', () => {
    renderHook(() => useOndoOutcomeToast());
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

  it('getNonWinnerNavigation returns ONDO campaign details route', () => {
    renderHook(() => useOndoOutcomeToast());
    const { getNonWinnerNavigation } =
      mockUseCampaignOutcomeToast.mock.calls[0][0];
    const nav = getNonWinnerNavigation(makeCampaign());
    expect(nav).toEqual({
      route: Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
      params: { campaignId: CAMPAIGN_ID },
    });
  });
});
