import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignOptInCta, { CAMPAIGN_CTA_TEST_IDS } from './CampaignOptInCta';

const mockNavigate = jest.fn();
const mockNavigateToSocialTab = jest.fn();
let mockIsSocialV1Enabled = false;
let mockProfile: { profileId?: string } | undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../../../selectors/featureFlagController/socialV1', () => ({
  selectIsSocialV1Enabled: () => mockIsSocialV1Enabled,
}));

jest.mock('../../../../../selectors/profileController', () => ({
  selectProfileControllerProfile: () => mockProfile,
}));

jest.mock(
  '../../../../Views/SocialLeaderboard/Onboarding/socialLeaderboardOnboardingNavigation',
  () => ({
    navigateToSocialTab: (...args: unknown[]) =>
      mockNavigateToSocialTab(...args),
  }),
);
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = (..._args: unknown[]) => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
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
const mockUseCampaignGeoRestriction = jest.fn<
  { isGeoRestricted: boolean; isGeoLoading: boolean },
  [unknown?, Set<string>?, boolean?]
>(() => ({
  isGeoRestricted: mockIsGeoRestricted,
  isGeoLoading: mockIsGeoLoading,
}));
jest.mock('../../hooks/useCampaignGeoRestriction', () => ({
  __esModule: true,
  default: (
    campaign: unknown,
    customRestrictedCountries?: Set<string>,
    isFeatureGeoRestricted?: boolean,
  ) =>
    mockUseCampaignGeoRestriction(
      campaign,
      customRestrictedCountries,
      isFeatureGeoRestricted,
    ),
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
      'rewards.campaign.create_username': 'Create a username',
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
    showUpcomingDate: false,
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
    mockIsSocialV1Enabled = false;
    mockProfile = undefined;
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

  describe('social profile requirement', () => {
    beforeEach(() => {
      mockIsSocialV1Enabled = true;
    });

    it('keeps the geo lock ahead of a required social profile', () => {
      mockIsGeoRestricted = true;
      const { getByTestId, queryByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign({ socialProfileRequired: true })}
          participantStatus={notOptedIn}
        />,
      );

      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockNavigateToSocialTab).not.toHaveBeenCalled();
      expect(queryByTestId('campaign-opt-in-sheet')).toBeNull();
    });

    it('opens the sheet when Social V1 is off even if the campaign requires a profile', () => {
      mockIsSocialV1Enabled = false;
      const { getByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign({ socialProfileRequired: true })}
          participantStatus={notOptedIn}
        />,
      );

      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

      expect(getByTestId('campaign-opt-in-sheet')).toBeOnTheScreen();
      expect(mockNavigateToSocialTab).not.toHaveBeenCalled();
    });

    it('opens the Social tab and skips the sheet when a profile is required and missing', () => {
      const { getByTestId, queryByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign({ socialProfileRequired: true })}
          participantStatus={notOptedIn}
        />,
      );

      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

      expect(mockNavigateToSocialTab).toHaveBeenCalledWith(mockNavigate);
      expect(queryByTestId('campaign-opt-in-sheet')).toBeNull();
    });

    it('opens the sheet when Social V1 is on, a profile is required, and the user has one', () => {
      mockProfile = { profileId: 'profile-1' };
      const { getByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign({ socialProfileRequired: true })}
          participantStatus={notOptedIn}
        />,
      );

      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

      expect(getByTestId('campaign-opt-in-sheet')).toBeOnTheScreen();
      expect(mockNavigateToSocialTab).not.toHaveBeenCalled();
    });

    it('labels the button Create a username when it opens Social onboarding', () => {
      const { getByTestId, queryByText } = render(
        <CampaignOptInCta
          campaign={buildCampaign({ socialProfileRequired: true })}
          participantStatus={notOptedIn}
        />,
      );

      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toHaveTextContent(
        'Create a username',
      );
      expect(queryByText('Join Campaign')).toBeNull();
    });

    it('keeps the Join Campaign label when the sheet opens instead', () => {
      const { getByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign({ socialProfileRequired: false })}
          participantStatus={notOptedIn}
        />,
      );

      expect(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toHaveTextContent(
        'Join Campaign',
      );
    });

    it('opens the sheet when Social V1 is on and the campaign does not require a profile', () => {
      const { getByTestId } = render(
        <CampaignOptInCta
          campaign={buildCampaign({ socialProfileRequired: false })}
          participantStatus={notOptedIn}
        />,
      );

      fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

      expect(getByTestId('campaign-opt-in-sheet')).toBeOnTheScreen();
      expect(mockNavigateToSocialTab).not.toHaveBeenCalled();
    });
  });

  describe('feature geo restriction', () => {
    it('passes isFeatureGeoRestricted to useCampaignGeoRestriction', () => {
      render(
        <CampaignOptInCta
          campaign={buildCampaign()}
          participantStatus={notOptedIn}
          isFeatureGeoRestricted
        />,
      );

      expect(mockUseCampaignGeoRestriction).toHaveBeenCalledWith(
        buildCampaign(),
        undefined,
        true,
      );
    });
  });
});
