import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import CampaignOptInSheet from './CampaignOptInSheet';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { useOptInToCampaign } from '../../hooks/useOptInToCampaign';
import { getDetectedGeolocation } from '../../../../../reducers/fiatOrders';
import { selectGeolocationStatus } from '../../../../../selectors/geolocationController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Per-selector state controlled by individual tests
let mockGeolocation: string | undefined = 'AU';
let mockGeoStatus: string | undefined = 'complete';

const setupSelectorMock = () => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === getDetectedGeolocation) return mockGeolocation;
    if (selector === selectGeolocationStatus) return mockGeoStatus;
    return undefined;
  });
};

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../ContentfulRichText/ContentfulRichText', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    isDocument: (val: unknown) =>
      val !== null &&
      typeof val === 'object' &&
      'nodeType' in (val as Record<string, unknown>) &&
      (val as Record<string, unknown>).nodeType === 'document',
    default: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(RNText, null, 'Rich text content'),
      ),
  };
});

jest.mock('../../hooks/useOptInToCampaign');
const mockUseOptInToCampaign = useOptInToCampaign as jest.MockedFunction<
  typeof useOptInToCampaign
>;

const mockShowToast = jest.fn();
const mockRewardsToastOptionsSuccess = jest.fn((title: string) => ({ title }));
jest.mock('../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      success: mockRewardsToastOptionsSuccess,
      error: jest.fn(),
    },
  }),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
        testID,
      }: {
        children?: React.ReactNode;
        testID?: string;
      }) => ReactActual.createElement(View, { testID }, children),
    };
  },
);

jest.mock('../RewardsInfoBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      description,
      testID,
    }: {
      title: string;
      description: string;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: testID ?? 'info-banner' },
        ReactActual.createElement(Text, null, title),
        ReactActual.createElement(Text, null, description),
      ),
  };
});

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      description,
      testID,
    }: {
      title: string;
      description: string;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: testID ?? 'error-banner' },
        ReactActual.createElement(Text, null, title),
        ReactActual.createElement(Text, null, description),
      ),
  };
});

jest.mock('../Onboarding/constants', () => ({
  REWARDS_ONBOARD_TERMS_URL: 'https://go.metamask.io/rewards-terms',
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaign.opt_in_sheet_title': 'Join Campaign',
      'rewards.campaign.opt_in_sheet_description_pre_link':
        'By joining you agree to the',
      'rewards.campaign.opt_in_sheet_link_text': 'Terms',
      'rewards.campaign.opt_in_sheet_description_post_link':
        'You can opt out at any time.',
      'rewards.campaign_details.opt_in_error': 'Failed to join campaign',
      'rewards.campaign.opt_in_cta': 'Join',
      'rewards.campaign.geo_restriction_banner_title':
        'Not available in your region',
      'rewards.campaign.geo_restriction_banner_description':
        'This campaign is not available in your region due to local regulations.',
      'rewards.onboarding.intro_confirm_geo_loading': 'Checking region...',
    };
    return translations[key] || key;
  },
}));

const createTestCampaign = (
  overrides: Partial<CampaignDto> = {},
): CampaignDto => ({
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

const mockOptInToCampaign = jest.fn();

describe('CampaignOptInSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast.mockClear();
    mockRewardsToastOptionsSuccess.mockClear();
    // Default: geo complete, non-restricted country — keeps non-geo tests clean.
    mockGeolocation = 'AU';
    mockGeoStatus = 'complete';
    setupSelectorMock();
    mockUseOptInToCampaign.mockReturnValue({
      optInToCampaign: mockOptInToCampaign,
      isOptingIn: false,
      optInError: undefined,
      clearOptInError: jest.fn(),
    });
  });

  it('renders the sheet title', () => {
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(getByTestId('campaign-opt-in-sheet-title')).toHaveTextContent(
      'Join Campaign',
    );
  });

  it('renders the description container', () => {
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(getByTestId('campaign-opt-in-sheet-description')).toBeDefined();
  });

  it('renders the terms link with correct text', () => {
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(getByTestId('campaign-opt-in-sheet-terms-link')).toHaveTextContent(
      'Terms',
    );
  });

  it('navigates to the terms URL when terms link is pressed', () => {
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    fireEvent.press(getByTestId('campaign-opt-in-sheet-terms-link'));
    expect(mockNavigate).toHaveBeenCalledWith('BrowserTabHome', {
      screen: 'BrowserView',
      params: expect.objectContaining({
        newTabUrl: 'https://go.metamask.io/rewards-terms',
      }),
    });
  });

  it('renders the CTA button', () => {
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(getByTestId('campaign-opt-in-cta')).toBeDefined();
  });

  it('calls optInToCampaign with the campaign id when CTA is pressed', () => {
    mockOptInToCampaign.mockResolvedValue({ optedIn: true });
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    fireEvent.press(getByTestId('campaign-opt-in-cta'));
    expect(mockOptInToCampaign).toHaveBeenCalledWith('campaign-1');
  });

  it('calls onClose after successful opt-in', async () => {
    const onClose = jest.fn();
    mockOptInToCampaign.mockResolvedValue({ optedIn: true });
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('campaign-opt-in-cta'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows success toast after successful opt-in', async () => {
    mockOptInToCampaign.mockResolvedValue({ optedIn: true });
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    fireEvent.press(getByTestId('campaign-opt-in-cta'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockRewardsToastOptionsSuccess).toHaveBeenCalledWith(
      'rewards.campaign.opt_in_success_toast',
    );
  });

  it('does not show toast when opt-in throws', async () => {
    mockOptInToCampaign.mockRejectedValue(new Error('API error'));
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    fireEvent.press(getByTestId('campaign-opt-in-cta'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('does not show toast or close when optedIn is false', async () => {
    const onClose = jest.fn();
    mockOptInToCampaign.mockResolvedValue({ optedIn: false });
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('campaign-opt-in-cta'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when opt-in throws', async () => {
    const onClose = jest.fn();
    mockOptInToCampaign.mockRejectedValue(new Error('API error'));
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('campaign-opt-in-cta'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders the close button', () => {
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(getByTestId('campaign-opt-in-sheet-close')).toBeDefined();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('campaign-opt-in-sheet-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows error banner when optInError is set', () => {
    mockUseOptInToCampaign.mockReturnValue({
      optInToCampaign: mockOptInToCampaign,
      isOptingIn: false,
      optInError: 'Something went wrong',
      clearOptInError: jest.fn(),
    });
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(getByTestId('campaign-opt-in-error-banner')).toBeDefined();
  });

  it('does not show error banner when there is no error', () => {
    const { queryByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    expect(queryByTestId('campaign-opt-in-error-banner')).toBeNull();
  });

  it('shows loading state on the CTA while opting in', () => {
    mockUseOptInToCampaign.mockReturnValue({
      optInToCampaign: mockOptInToCampaign,
      isOptingIn: true,
      optInError: undefined,
      clearOptInError: jest.fn(),
    });
    const { getByTestId } = render(
      <CampaignOptInSheet campaign={createTestCampaign()} />,
    );
    // Button still renders while loading
    expect(getByTestId('campaign-opt-in-cta')).toBeDefined();
  });

  describe('geo loading state', () => {
    it('shows geo loading text on the CTA while geo status is loading', () => {
      mockGeoStatus = 'loading';
      setupSelectorMock();
      const { getByTestId } = render(
        <CampaignOptInSheet campaign={createTestCampaign()} />,
      );
      expect(getByTestId('campaign-opt-in-cta')).toHaveTextContent(
        'Checking region...',
      );
    });

    it('disables the CTA while geo status is loading', () => {
      mockGeoStatus = 'loading';
      setupSelectorMock();
      render(<CampaignOptInSheet campaign={createTestCampaign()} />);
      // CTA is disabled — pressing should not call optInToCampaign
      // (fireEvent.press on a disabled button is a no-op in RNTL)
      expect(mockOptInToCampaign).not.toHaveBeenCalled();
    });

    it('does not show geo-restriction banner while geo status is loading', () => {
      mockGeoStatus = 'loading';
      mockGeolocation = undefined;
      setupSelectorMock();
      const { queryByTestId } = render(
        <CampaignOptInSheet campaign={createTestCampaign()} />,
      );
      expect(
        queryByTestId('campaign-opt-in-geo-restriction-banner'),
      ).toBeNull();
    });

    it('shows opt-in CTA text once geo status is complete', () => {
      mockGeoStatus = 'complete';
      mockGeolocation = 'AU';
      setupSelectorMock();
      const { getByTestId } = render(
        <CampaignOptInSheet campaign={createTestCampaign()} />,
      );
      expect(getByTestId('campaign-opt-in-cta')).toHaveTextContent('Join');
    });
  });

  describe('geo-restriction (ONDO_HOLDING)', () => {
    // ONDO_HOLDING uses ONDO_RESTRICTED_COUNTRIES via the same check as the
    // RWA Trending feature. __DEV__ bypasses restriction; we set it to false
    // in this block to test production behaviour.
    beforeEach(() => {
      (global as Record<string, unknown>).__DEV__ = false;
      mockGeoStatus = 'complete';
      setupSelectorMock();
    });
    afterEach(() => {
      (global as Record<string, unknown>).__DEV__ = true;
    });

    it('shows geo-restriction banner when user is in a restricted country', () => {
      mockGeolocation = 'US';
      setupSelectorMock();
      const { getByTestId } = render(
        <CampaignOptInSheet campaign={createTestCampaign()} />,
      );
      expect(
        getByTestId('campaign-opt-in-geo-restriction-banner'),
      ).toBeDefined();
    });

    it('shows geo-restriction banner when sub-region resolves to a restricted country', () => {
      mockGeolocation = 'US-CA';
      setupSelectorMock();
      const { getByTestId } = render(
        <CampaignOptInSheet campaign={createTestCampaign()} />,
      );
      expect(
        getByTestId('campaign-opt-in-geo-restriction-banner'),
      ).toBeDefined();
    });

    it('shows geo-restriction banner when geolocation is undefined after fetch completes', () => {
      mockGeolocation = undefined;
      setupSelectorMock();
      const { getByTestId } = render(
        <CampaignOptInSheet campaign={createTestCampaign()} />,
      );
      expect(
        getByTestId('campaign-opt-in-geo-restriction-banner'),
      ).toBeDefined();
    });

    it('does not show geo-restriction banner when user is in an allowed country', () => {
      // AU (Australia) is not in ONDO_RESTRICTED_COUNTRIES
      mockGeolocation = 'AU';
      setupSelectorMock();
      const { queryByTestId } = render(
        <CampaignOptInSheet campaign={createTestCampaign()} />,
      );
      expect(
        queryByTestId('campaign-opt-in-geo-restriction-banner'),
      ).toBeNull();
    });

    it('does not show geo-restriction banner in DEV mode regardless of country', () => {
      (global as Record<string, unknown>).__DEV__ = true;
      mockGeolocation = 'US';
      setupSelectorMock();
      const { queryByTestId } = render(
        <CampaignOptInSheet campaign={createTestCampaign()} />,
      );
      expect(
        queryByTestId('campaign-opt-in-geo-restriction-banner'),
      ).toBeNull();
    });

    it('ignores excludedRegions for ONDO_HOLDING (uses ONDO_RESTRICTED_COUNTRIES instead)', () => {
      // AU is not in ONDO_RESTRICTED_COUNTRIES — banner should NOT show
      // even if AU is in the campaign's excludedRegions
      mockGeolocation = 'AU';
      setupSelectorMock();
      const { queryByTestId } = render(
        <CampaignOptInSheet
          campaign={createTestCampaign({ excludedRegions: ['AU'] })}
        />,
      );
      expect(
        queryByTestId('campaign-opt-in-geo-restriction-banner'),
      ).toBeNull();
    });

    it('disables the CTA when user is geo-restricted', () => {
      mockGeolocation = 'GB';
      setupSelectorMock();
      const { getByTestId } = render(
        <CampaignOptInSheet campaign={createTestCampaign()} />,
      );
      fireEvent.press(getByTestId('campaign-opt-in-cta'));
      expect(mockOptInToCampaign).not.toHaveBeenCalled();
    });

    it('does not disable the CTA when user is in an allowed country', () => {
      mockGeolocation = 'AU';
      setupSelectorMock();
      mockOptInToCampaign.mockResolvedValue({ optedIn: true });
      const { getByTestId } = render(
        <CampaignOptInSheet campaign={createTestCampaign()} />,
      );
      fireEvent.press(getByTestId('campaign-opt-in-cta'));
      expect(mockOptInToCampaign).toHaveBeenCalledWith('campaign-1');
    });
  });
});
