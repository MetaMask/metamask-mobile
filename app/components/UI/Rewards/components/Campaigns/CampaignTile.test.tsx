import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import CampaignTile from './CampaignTile';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getCampaignStatusInfo } from './CampaignTile.utils';
import { selectCampaignParticipantCount } from '../../../../../reducers/rewards/selectors';
import useGetCampaignParticipantStatus from '../../hooks/useGetCampaignParticipantStatus';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

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
}));

jest.mock('../../../../../reducers/rewards/selectors', () => ({
  selectCampaignParticipantCount: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'rewards.campaign.enter_now': 'Enter now',
      'rewards.campaign.entered': 'Entered',
      'rewards.campaign.participant_count': `#${params?.count ?? ''}`,
    };
    return translations[key] || key;
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectCampaignParticipantCount =
  selectCampaignParticipantCount as jest.MockedFunction<
    typeof selectCampaignParticipantCount
  >;

const createTestCampaign = (overrides = {}): CampaignDto => ({
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test Campaign',
  startDate: '2027-01-01T00:00:00.000Z',
  endDate: '2027-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  statusLabel: 'Active',
  details: null,
  ...overrides,
});

function setupParticipantCount(count: number | null) {
  const mockSelector = jest.fn().mockReturnValue(count);
  mockSelectCampaignParticipantCount.mockReturnValue(mockSelector);
  mockUseSelector.mockImplementation((selector) => {
    if (selector === mockSelector) return count;
    return undefined;
  });
}

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
    setupParticipantCount(null);
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

  it('renders date label via campaign-tile-date-label testID', () => {
    const campaign = createTestCampaign();

    const { getByTestId } = render(<CampaignTile campaign={campaign} />);

    expect(getByTestId('campaign-tile-date-label')).toHaveTextContent(
      'Ends Mar 15, 2:30 PM',
    );
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
      details: {
        image: {
          lightModeUrl: 'https://example.com/light.png',
          darkModeUrl: 'https://example.com/dark.png',
        },
        howItWorks: {
          title: '',
          description: '',
          phases: [],
        },
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

  describe('enter now label', () => {
    it('renders enter-now when status is active and participantCount is null', () => {
      setupParticipantCount(null);
      const campaign = createTestCampaign();

      const { getByTestId, queryByTestId } = render(
        <CampaignTile campaign={campaign} />,
      );

      expect(getByTestId('campaign-tile-enter-now')).toHaveTextContent(
        '•Enter now',
      );
      expect(queryByTestId('campaign-tile-participant-count')).toBeNull();
    });

    it('does not render enter-now when status is upcoming', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'upcoming',
        statusLabel: 'Up next',
        dateLabel: 'Starts June 1',
        dateLabelIcon: 'Speed',
      });
      setupParticipantCount(null);
      const campaign = createTestCampaign();

      const { queryByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(queryByTestId('campaign-tile-enter-now')).toBeNull();
      expect(queryByTestId('campaign-tile-participant-count')).toBeNull();
    });

    it('does not render enter-now when status is complete', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'complete',
        statusLabel: 'Complete',
        dateLabel: 'December 31',
        dateLabelIcon: 'Confirmation',
      });
      setupParticipantCount(null);
      const campaign = createTestCampaign();

      const { queryByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(queryByTestId('campaign-tile-enter-now')).toBeNull();
      expect(queryByTestId('campaign-tile-participant-count')).toBeNull();
    });
  });

  describe('participant count', () => {
    it('renders participant count when count is available', () => {
      setupParticipantCount(1234);
      const campaign = createTestCampaign();

      const { getByTestId, queryByTestId } = render(
        <CampaignTile campaign={campaign} />,
      );

      expect(getByTestId('campaign-tile-participant-count')).toHaveTextContent(
        '#1,234',
      );
      expect(queryByTestId('campaign-tile-enter-now')).toBeNull();
    });

    it('renders participant count of zero', () => {
      setupParticipantCount(0);
      const campaign = createTestCampaign();

      const { getByTestId, queryByTestId } = render(
        <CampaignTile campaign={campaign} />,
      );

      expect(getByTestId('campaign-tile-participant-count')).toHaveTextContent(
        '#0',
      );
      expect(queryByTestId('campaign-tile-enter-now')).toBeNull();
    });

    it('renders participant count even when status is not active', () => {
      (getCampaignStatusInfo as jest.Mock).mockReturnValue({
        status: 'complete',
        statusLabel: 'Complete',
        dateLabel: 'December 31',
        dateLabelIcon: 'Confirmation',
      });
      setupParticipantCount(5000);
      const campaign = createTestCampaign();

      const { getByTestId, queryByTestId } = render(
        <CampaignTile campaign={campaign} />,
      );

      expect(getByTestId('campaign-tile-participant-count')).toHaveTextContent(
        '#5,000',
      );
      expect(queryByTestId('campaign-tile-enter-now')).toBeNull();
    });
  });

  describe('entered label', () => {
    it('shows "Entered" label when participant is opted in', () => {
      setupParticipantStatus(true);
      const campaign = createTestCampaign();

      const { getByTestId, queryByTestId } = render(
        <CampaignTile campaign={campaign} />,
      );

      expect(getByTestId('campaign-tile-entered-label')).toHaveTextContent(
        'Entered',
      );
      expect(queryByTestId('campaign-tile-enter-now')).toBeNull();
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

    it('shows "Entered" label alongside participant count when opted in', () => {
      setupParticipantStatus(true);
      setupParticipantCount(42);
      const campaign = createTestCampaign();

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);

      expect(getByTestId('campaign-tile-entered-label')).toHaveTextContent(
        'Entered',
      );
      expect(getByTestId('campaign-tile-participant-count')).toHaveTextContent(
        '#42',
      );
    });
  });

  describe('navigation', () => {
    it('navigates to campaign details when the tile is pressed', () => {
      const campaign = createTestCampaign({ id: 'camp-42' });

      const { getByTestId } = render(<CampaignTile campaign={campaign} />);
      fireEvent.press(getByTestId('campaign-tile-camp-42'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CAMPAIGN_DETAILS, {
        campaignId: 'camp-42',
      });
    });
  });
});
