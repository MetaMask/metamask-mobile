import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignOptInCta, { CAMPAIGN_CTA_TEST_IDS } from './CampaignOptInCta';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

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

// Controlled per-test via these variables
let mockIsGeoRestricted = false;
let mockIsGeoLoading = false;
jest.mock('../../hooks/useCampaignGeoRestriction', () => ({
  __esModule: true,
  default: () => ({
    isGeoRestricted: mockIsGeoRestricted,
    isGeoLoading: mockIsGeoLoading,
  }),
}));

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
      'rewards.campaign.geo_loading': 'Checking region...',
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

const notOptedIn = {
  status: { optedIn: false, participantCount: 0 } as const,
  isLoading: false,
};

const optedIn = {
  status: { optedIn: true, participantCount: 1 } as const,
  isLoading: false,
};

describe('CampaignOptInCta', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-15T12:00:00.000Z'));
    jest.clearAllMocks();
    mockIsGeoRestricted = false;
    mockIsGeoLoading = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('returns null', () => {
    it('renders nothing when campaign is not active (upcoming)', () => {
      const { queryByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign({
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-12-31T23:59:59.999Z',
          })}
          participantStatus={notOptedIn}
        />,
      );

      expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
    });

    it('renders nothing while participant status is loading', () => {
      const { queryByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign()}
          participantStatus={{ status: null, isLoading: true }}
        />,
      );

      expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
    });

    it('renders nothing when user is already opted in', () => {
      const { queryByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign()}
          participantStatus={optedIn}
        />,
      );

      expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
    });
  });

  describe('opt-in flow (not geo-restricted)', () => {
    it('renders the opt-in CTA button when active and not yet opted in', () => {
      const { getByTestId, getByText } = render(
        <CampaignOptInCta
          campaign={buildCampaign()}
          participantStatus={notOptedIn}
        />,
      );

      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeOnTheScreen();
      expect(getByText('Join Campaign')).toBeOnTheScreen();
    });

    it('opens the opt-in sheet when the button is pressed', () => {
      const { getByTestId, queryByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign()}
          participantStatus={notOptedIn}
        />,
      );

      expect(queryByTestId('campaign-opt-in-sheet')).toBeNull();
      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));
      expect(getByTestId('campaign-opt-in-sheet')).toBeOnTheScreen();
    });
  });

  describe('geo loading flow', () => {
    beforeEach(() => {
      mockIsGeoLoading = true;
    });

    it('renders the join button in loading state while geo is loading', () => {
      const { getByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign()}
          participantStatus={notOptedIn}
        />,
      );
      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeOnTheScreen();
    });

    it('does not open the opt-in sheet when tapped while geo is loading', () => {
      const { getByTestId, queryByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign()}
          participantStatus={notOptedIn}
        />,
      );
      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));
      expect(queryByTestId('campaign-opt-in-sheet')).toBeNull();
    });

    it('does not call onJoinPress when tapped while geo is loading', () => {
      const onJoinPress = jest.fn();
      const { getByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign()}
          participantStatus={notOptedIn}
          onJoinPress={onJoinPress}
        />,
      );
      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));
      expect(onJoinPress).not.toHaveBeenCalled();
    });
  });

  describe('geo-locked flow', () => {
    beforeEach(() => {
      mockIsGeoRestricted = true;
    });

    it('renders "Check eligibility" button with a lock icon when geo-restricted', () => {
      const { getByTestId, getByText } = render(
        <CampaignOptInCta
          campaign={buildCampaign()}
          participantStatus={notOptedIn}
        />,
      );
      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeOnTheScreen();
      expect(getByText('Check eligibility')).toBeOnTheScreen();
    });

    it('shows the geo-locked toast when the button is pressed', () => {
      const { getByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign()}
          participantStatus={notOptedIn}
        />,
      );
      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));
      expect(mockEntriesClosed).toHaveBeenCalledWith(
        'Not available in your region',
        "This campaign isn't available where you are. Check back later for new campaigns.",
      );
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('does not open the opt-in sheet when geo-restricted', () => {
      const { getByTestId, queryByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign()}
          participantStatus={notOptedIn}
        />,
      );
      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));
      expect(queryByTestId('campaign-opt-in-sheet')).toBeNull();
    });

    it('returns null when already opted in, even if geo-restricted', () => {
      const { queryByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign()}
          participantStatus={optedIn}
        />,
      );
      expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
    });
  });
});
