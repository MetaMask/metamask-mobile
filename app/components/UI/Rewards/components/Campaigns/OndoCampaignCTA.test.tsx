import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoCampaignCTA from './OndoCampaignCTA';
import { CAMPAIGN_CTA_TEST_IDS } from './CampaignOptInCta';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('./CampaignOptInSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'campaign-opt-in-sheet',
      }),
  };
});

const mockShowToast = jest.fn();
const mockEntriesClosed = jest.fn(() => ({ variant: 'icon' }));

jest.mock('../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      success: jest.fn(),
      error: jest.fn(),
      entriesClosed: mockEntriesClosed,
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'rewards.campaign_details.join_campaign': 'Join Campaign',
      'rewards.campaign_details.ondo.open_position': 'Open Position',
      'rewards.campaign_details.ondo.entries_closed_title': 'Entries closed',
      'rewards.campaign_details.ondo.entries_closed_description':
        'You missed the opt-in window. Check back for more campaigns in the future.',
    };
    return map[key] ?? key;
  },
}));

function buildCampaign(overrides: Partial<CampaignDto> = {}): CampaignDto {
  return {
    id: 'campaign-1',
    type: CampaignType.ONDO_HOLDING,
    name: 'Test Campaign',
    startDate: '2025-06-01T00:00:00.000Z',
    endDate: '2025-12-31T23:59:59.999Z',
    termsAndConditions: null,
    excludedRegions: [],
    details: null,
    featured: true,
    ...overrides,
  };
}

const defaultProps = {
  hasPositions: false,
  campaignId: 'campaign-1',
};

const notOptedIn = {
  status: { optedIn: false, participantCount: 0 } as const,
  isLoading: false,
};

const optedIn = {
  status: { optedIn: true, participantCount: 1 } as const,
  isLoading: false,
};

describe('OndoCampaignCTA', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-15T12:00:00.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('visibility', () => {
    it('renders nothing when campaign is not active (upcoming)', () => {
      const { queryByTestId } = render(
        <OndoCampaignCTA
          campaign={buildCampaign({
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-12-31T23:59:59.999Z',
          })}
          participantStatus={notOptedIn}
          {...defaultProps}
        />,
      );

      expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
    });

    it('renders nothing while participant status is loading', () => {
      const { queryByTestId } = render(
        <OndoCampaignCTA
          campaign={buildCampaign()}
          participantStatus={{ status: null, isLoading: true }}
          {...defaultProps}
        />,
      );

      expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
    });

    it('renders "Entries closed" button when campaign is complete', () => {
      const { getByTestId, getByText } = render(
        <OndoCampaignCTA
          campaign={buildCampaign({
            startDate: '2024-01-01T00:00:00.000Z',
            endDate: '2025-01-01T00:00:00.000Z',
          })}
          participantStatus={notOptedIn}
          {...defaultProps}
        />,
      );

      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeOnTheScreen();
      expect(getByText('Entries closed')).toBeOnTheScreen();
    });

    it('shows the entries-closed toast when the button is pressed on a complete campaign', () => {
      const { getByTestId } = render(
        <OndoCampaignCTA
          campaign={buildCampaign({
            startDate: '2024-01-01T00:00:00.000Z',
            endDate: '2025-01-01T00:00:00.000Z',
          })}
          participantStatus={notOptedIn}
          {...defaultProps}
        />,
      );

      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

      expect(mockEntriesClosed).toHaveBeenCalledWith(
        'Entries closed',
        'You missed the opt-in window. Check back for more campaigns in the future.',
      );
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });
  });

  describe('not opted in', () => {
    it('delegates to CampaignCTA and renders the opt-in button', () => {
      const { getByTestId, getByText } = render(
        <OndoCampaignCTA
          campaign={buildCampaign()}
          participantStatus={notOptedIn}
          {...defaultProps}
        />,
      );

      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeOnTheScreen();
      expect(getByText('Join Campaign')).toBeOnTheScreen();
    });
  });

  describe('opted in, no portfolio positions', () => {
    it('renders the "Open Position" button', () => {
      const { getByTestId, getByText } = render(
        <OndoCampaignCTA
          campaign={buildCampaign()}
          participantStatus={optedIn}
          {...defaultProps}
          hasPositions={false}
        />,
      );

      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeOnTheScreen();
      expect(getByText('Open Position')).toBeOnTheScreen();
    });

    it('navigates to RWA asset selector in open_position mode when pressed', () => {
      const { getByTestId } = render(
        <OndoCampaignCTA
          campaign={buildCampaign()}
          participantStatus={optedIn}
          {...defaultProps}
          hasPositions={false}
        />,
      );

      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR,
        { mode: 'open_position', campaignId: 'campaign-1' },
      );
    });
  });

  describe('opted in, with portfolio positions', () => {
    it('renders the "Open Position" button', () => {
      const { getByTestId, getByText } = render(
        <OndoCampaignCTA
          campaign={buildCampaign()}
          participantStatus={optedIn}
          {...defaultProps}
          hasPositions
        />,
      );

      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeOnTheScreen();
      expect(getByText('Open Position')).toBeOnTheScreen();
    });

    it('navigates to RWA asset selector in swap mode when pressed', () => {
      const { getByTestId } = render(
        <OndoCampaignCTA
          campaign={buildCampaign()}
          participantStatus={optedIn}
          {...defaultProps}
          hasPositions
        />,
      );

      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR,
        { mode: 'swap', campaignId: 'campaign-1' },
      );
    });
  });
});
