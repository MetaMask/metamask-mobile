import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignTile from './CampaignTile';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  getCampaignStatusInfo,
  isCampaignTypeSupported,
} from './CampaignTile.utils';
import useGetCampaignParticipantStatus from '../../hooks/useGetCampaignParticipantStatus';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn().mockReturnValue({
    navigate: (...args: unknown[]) => mockNavigate(...args),
  }),
}));

jest.mock('../../hooks/useGetCampaignParticipantStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseGetCampaignParticipantStatus =
  useGetCampaignParticipantStatus as jest.MockedFunction<
    typeof useGetCampaignParticipantStatus
  >;

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../hooks/useGetCampaignParticipantStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('./CampaignTile.utils', () => ({
  getCampaignStatusInfo: jest.fn().mockReturnValue({
    status: 'active',
    statusLabel: 'Active',
    dateLabel: 'Ends Mar 15, 2:30 PM',
    dateLabelIcon: 'Clock',
  }),
  isCampaignTypeSupported: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaign.enter': 'Enter',
      'rewards.campaign.entered': 'Entered',
    };
    return translations[key] || key;
  },
}));

const createTestCampaign = (overrides = {}): CampaignDto => ({
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test Campaign',
  startDate: '2027-01-01T00:00:00.000Z',
  endDate: '2027-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  ...overrides,
});

function setupParticipantStatus(optedIn: boolean) {
  mockUseGetCampaignParticipantStatus.mockReturnValue({
    status: { optedIn, participantCount: 0 },
    isLoading: false,
    hasError: false,
    refetch: jest.fn(),
  });
}

describe('CampaignTile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCampaignStatusInfo as jest.Mock).mockReturnValue({
      status: 'active',
      statusLabel: 'Active',
      dateLabel: 'Ends Mar 15, 2:30 PM',
      dateLabelIcon: 'Clock',
    });
    (isCampaignTypeSupported as jest.Mock).mockReturnValue(true);
    mockUseGetCampaignParticipantStatus.mockReturnValue({
      status: null,
      isLoading: false,
      hasError: false,
      refetch: jest.fn(),
    });
  });

  it('renders campaign name via campaign-tile-name testID', () => {
    const campaign = createTestCampaign({ name: 'My Campaign' });

    const { getByTestId } = render(<CampaignTile campaign={campaign} />);

    expect(getByTestId('campaign-tile-name')).toHaveTextContent('My Campaign');
  });

  it('renders date info label via campaign-tile-date-info testID', () => {
    const campaign = createTestCampaign();

    const { getByTestId } = render(<CampaignTile campaign={campaign} />);

    expect(getByTestId('campaign-tile-date-info')).toBeDefined();
  });

  it('renders status label via campaign-tile-status-label testID', () => {
    const campaign = createTestCampaign();

    const { getByTestId } = render(<CampaignTile campaign={campaign} />);

    expect(getByTestId('campaign-tile-status-label')).toHaveTextContent(
      /Active/,
    );
  });

  it('renders background image via campaign-tile-background testID', () => {
    const campaign = createTestCampaign({
      image: {
        lightModeUrl: 'https://example.com/light.png',
        darkModeUrl: 'https://example.com/dark.png',
      },
    });

    const { getByTestId } = render(<CampaignTile campaign={campaign} />);

    expect(getByTestId('campaign-tile-background')).toBeDefined();
  });

  it('calls getCampaignStatusInfo with campaign', () => {
    const campaign = createTestCampaign();

    render(<CampaignTile campaign={campaign} />);

    expect(getCampaignStatusInfo).toHaveBeenCalledWith(campaign);
  });

  describe('date label', () => {
    it('renders date label for active campaign', () => {
      const campaign = createTestCampaign();

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-date-info')).toHaveTextContent(
        'Ends Mar 15, 2:30 PM',
      );
    });

    it('renders date label for upcoming campaign', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign();

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-date-info')).toHaveTextContent(
        'Starts June 1',
      );
    });

    it('renders date label for complete campaign', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'complete',
        statusLabel: 'Complete',
        dateLabel: 'December 31',
        dateLabelIcon: 'Confirmation',
      });
      const campaign = createTestCampaign();

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-date-info')).toHaveTextContent(
        'December 31',
      );
    });
  });

  describe('entered label', () => {
    it('shows "Entered" label when participant is opted in', () => {
      setupParticipantStatus(true);
      const campaign = createTestCampaign();

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-entered-label')).toHaveTextContent(
        'Entered',
      );
    });

    it('shows status label when participant is not opted in', () => {
      setupParticipantStatus(false);
      const campaign = createTestCampaign();

      const { queryByTestId, getByTestId } = render(
        <CampaignTile campaign={campaign} />,
      );

      expect(queryByTestId('campaign-tile-entered-label')).toBeNull();
      expect(getByTestId('campaign-tile-status-label')).toHaveTextContent(
        /Active/,
      );
    });

    it('shows "Entered" label alongside date label when opted in', () => {
      setupParticipantStatus(true);
      const campaign = createTestCampaign();

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-entered-label')).toHaveTextContent(
        'Entered',
      );
      expect(getByTestId('campaign-tile-date-info')).toHaveTextContent(
        'Ends Mar 15, 2:30 PM',
      );
    });
  });

  describe('participant status hook call conditions', () => {
    it('calls hook with campaign.id when campaign is active and ONDO_HOLDING type', () => {
      const campaign = createTestCampaign({
        id: 'ondo-active',
        type: CampaignType.ONDO_HOLDING,
      });

      render(<CampaignTile campaign={campaign} />);

      expect(mockUseGetCampaignParticipantStatus).toHaveBeenCalledWith(
        'ondo-active',
      );
    });

    it('calls hook with undefined when campaign is upcoming', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'ondo-upcoming',
        type: CampaignType.ONDO_HOLDING,
      });

      render(<CampaignTile campaign={campaign} />);

      expect(mockUseGetCampaignParticipantStatus).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('calls hook with undefined when campaign is complete', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'complete',
        statusLabel: 'Complete',
        dateLabel: 'December 31',
        dateLabelIcon: 'Confirmation',
      });
      const campaign = createTestCampaign({
        id: 'ondo-complete',
        type: CampaignType.ONDO_HOLDING,
      });

      render(<CampaignTile campaign={campaign} />);

      expect(mockUseGetCampaignParticipantStatus).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('calls hook with undefined when campaign is active but not ONDO_HOLDING type', () => {
      const campaign = createTestCampaign({
        id: 'season-active',
        type: CampaignType.SEASON_1,
      });

      render(<CampaignTile campaign={campaign} />);

      expect(mockUseGetCampaignParticipantStatus).toHaveBeenCalledWith(
        undefined,
      );
    });
  });

  describe('navigation', () => {
    it('navigates to Ondo campaign details for ONDO_HOLDING type', () => {
      const campaign = createTestCampaign({
        id: 'camp-ondo',
        type: CampaignType.ONDO_HOLDING,
      });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);
      fireEvent.press(getByTestId('campaign-tile-camp-ondo'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
        {
          campaignId: 'camp-ondo',
        },
      );
    });

    it('navigates to season one campaign details for SEASON_1 type', () => {
      const campaign = createTestCampaign({
        id: 'camp-season',
        type: CampaignType.SEASON_1,
      });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);
      fireEvent.press(getByTestId('campaign-tile-camp-season'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW,
        {
          campaignId: 'camp-season',
        },
      );
    });

    it('calls custom onPress handler instead of navigating when provided', () => {
      const campaign = createTestCampaign({ id: 'camp-custom' });
      const mockOnPress = jest.fn();

      const { getByTestId } = render(
        <CampaignTile campaign={campaign} onPress={mockOnPress} />,
      );
      fireEvent.press(getByTestId('campaign-tile-camp-custom'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate for unsupported campaign type without onPress', () => {
      (isCampaignTypeSupported as jest.Mock).mockReturnValue(false);
      const campaign = createTestCampaign({
        id: 'camp-unsupported',
        type: 'UNKNOWN_TYPE' as CampaignType,
      });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);
      fireEvent.press(getByTestId('campaign-tile-camp-unsupported'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('calls onPress for unsupported campaign type when onPress is provided', () => {
      (isCampaignTypeSupported as jest.Mock).mockReturnValue(false);
      const campaign = createTestCampaign({
        id: 'camp-unsupported-press',
        type: 'UNKNOWN_TYPE' as CampaignType,
      });
      const mockOnPress = jest.fn();

      const { getByTestId } = render(
        <CampaignTile campaign={campaign} onPress={mockOnPress} />,
      );
      fireEvent.press(getByTestId('campaign-tile-camp-unsupported-press'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate for any campaign type when status is upcoming', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'camp-ondo-upcoming',
        type: CampaignType.ONDO_HOLDING,
      });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);
      fireEvent.press(getByTestId('campaign-tile-camp-ondo-upcoming'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not call onPress for any campaign type when status is upcoming', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Coming soon',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      const campaign = createTestCampaign({
        id: 'camp-season-upcoming',
        type: CampaignType.SEASON_1,
      });
      const mockOnPress = jest.fn();

      const { getByTestId } = render(
        <CampaignTile campaign={campaign} onPress={mockOnPress} />,
      );
      fireEvent.press(getByTestId('campaign-tile-camp-season-upcoming'));

      expect(mockOnPress).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates for ONDO_HOLDING campaign when status is active', () => {
      const campaign = createTestCampaign({
        id: 'camp-ondo-active',
        type: CampaignType.ONDO_HOLDING,
      });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);
      fireEvent.press(getByTestId('campaign-tile-camp-ondo-active'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
        { campaignId: 'camp-ondo-active' },
      );
    });
  });
});
