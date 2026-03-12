import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignDetailsView, {
  CAMPAIGN_DETAILS_TEST_IDS,
} from './CampaignDetailsView';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { useGetCampaignParticipantStatus } from '../hooks/useGetCampaignParticipantStatus';
import { useOptInToCampaign } from '../hooks/useOptInToCampaign';
import { handleDeeplink } from '../../../../core/DeeplinkManager';
import { CAMPAIGN_STATUS_TEST_IDS } from '../components/Campaigns/CampaignStatus';

const mockCampaign: CampaignDto = {
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test Campaign',
  startDate: '2027-01-01T00:00:00.000Z',
  endDate: '2027-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  statusLabel: 'Active',
  details: null,
};

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({
    params: { campaign: mockCampaign },
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ title, onBack }: { title: string; onBack: () => void }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: 'header-back-button',
          }),
        ),
    };
  },
);

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock('../components/Campaigns/CampaignStatus', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  const actual = jest.requireActual('../components/Campaigns/CampaignStatus');
  return {
    __esModule: true,
    CAMPAIGN_STATUS_TEST_IDS: actual.CAMPAIGN_STATUS_TEST_IDS,
    default: ({ campaign }: { campaign: CampaignDto }) =>
      ReactActual.createElement(
        View,
        { testID: actual.CAMPAIGN_STATUS_TEST_IDS.CONTAINER },
        ReactActual.createElement(Text, null, campaign.name),
      ),
  };
});

jest.mock('../hooks/useGetCampaignParticipantStatus');
jest.mock('../hooks/useOptInToCampaign');
jest.mock('../../../../core/DeeplinkManager');

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaign_details.join_campaign': 'Join the campaign',
      'rewards.campaign_details.swap': 'Swap',
    };
    return translations[key] || key;
  },
}));

const mockUseGetCampaignParticipantStatus =
  useGetCampaignParticipantStatus as jest.MockedFunction<
    typeof useGetCampaignParticipantStatus
  >;
const mockUseOptInToCampaign = useOptInToCampaign as jest.MockedFunction<
  typeof useOptInToCampaign
>;
const mockHandleDeeplink = handleDeeplink as jest.MockedFunction<
  typeof handleDeeplink
>;

const mockOptInToCampaign = jest.fn().mockResolvedValue(null);

function setupHooks({
  optedIn = false,
  isStatusLoading = false,
  isOptingIn = false,
} = {}) {
  mockUseGetCampaignParticipantStatus.mockReturnValue({
    status: optedIn ? { optedIn: true, participantCount: 100 } : null,
    isLoading: isStatusLoading,
    hasError: false,
    refetch: jest.fn(),
  });
  mockUseOptInToCampaign.mockReturnValue({
    optInToCampaign: mockOptInToCampaign,
    isOptingIn,
    optInError: undefined,
    clearOptInError: jest.fn(),
  });
}

describe('CampaignDetailsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHooks();
  });

  it('renders the container', () => {
    const { getByTestId } = render(<CampaignDetailsView />);
    expect(getByTestId(CAMPAIGN_DETAILS_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders campaign name in header', () => {
    const { getByTestId } = render(<CampaignDetailsView />);
    expect(getByTestId('header')).toHaveTextContent('Test Campaign');
  });

  it('renders CampaignStatus component', () => {
    const { getByTestId } = render(<CampaignDetailsView />);
    expect(getByTestId(CAMPAIGN_STATUS_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('navigates back when header back button is pressed', () => {
    const { getByTestId } = render(<CampaignDetailsView />);
    fireEvent.press(getByTestId('header-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  describe('CTA button', () => {
    it('shows "Join the campaign" when user has not opted in', () => {
      setupHooks({ optedIn: false });
      const { getByTestId } = render(<CampaignDetailsView />);
      expect(
        getByTestId(CAMPAIGN_DETAILS_TEST_IDS.CTA_BUTTON),
      ).toHaveTextContent('Join the campaign');
    });

    it('shows "Swap" when user has opted in', () => {
      setupHooks({ optedIn: true });
      const { getByTestId } = render(<CampaignDetailsView />);
      expect(
        getByTestId(CAMPAIGN_DETAILS_TEST_IDS.CTA_BUTTON),
      ).toHaveTextContent('Swap');
    });

    it('calls optInToCampaign when not opted in and CTA is pressed', () => {
      setupHooks({ optedIn: false });
      const { getByTestId } = render(<CampaignDetailsView />);
      fireEvent.press(getByTestId(CAMPAIGN_DETAILS_TEST_IDS.CTA_BUTTON));
      expect(mockOptInToCampaign).toHaveBeenCalledWith('campaign-1');
    });

    it('calls handleDeeplink with swap URL when opted in and CTA is pressed', () => {
      setupHooks({ optedIn: true });
      const { getByTestId } = render(<CampaignDetailsView />);
      fireEvent.press(getByTestId(CAMPAIGN_DETAILS_TEST_IDS.CTA_BUTTON));
      expect(mockHandleDeeplink).toHaveBeenCalledWith({
        uri: 'https://link.metamask.io/swap',
      });
    });

    it('does not call optInToCampaign when opted in', () => {
      setupHooks({ optedIn: true });
      const { getByTestId } = render(<CampaignDetailsView />);
      fireEvent.press(getByTestId(CAMPAIGN_DETAILS_TEST_IDS.CTA_BUTTON));
      expect(mockOptInToCampaign).not.toHaveBeenCalled();
    });

    it('does not call handleDeeplink when not opted in', () => {
      setupHooks({ optedIn: false });
      const { getByTestId } = render(<CampaignDetailsView />);
      fireEvent.press(getByTestId(CAMPAIGN_DETAILS_TEST_IDS.CTA_BUTTON));
      expect(mockHandleDeeplink).not.toHaveBeenCalled();
    });
  });
});
