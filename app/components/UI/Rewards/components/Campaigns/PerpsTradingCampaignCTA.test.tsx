import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import PerpsTradingCampaignCTA from './PerpsTradingCampaignCTA';
import { CAMPAIGN_CTA_TEST_IDS } from './CampaignOptInCta';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { selectPerpsEligibility } from '../../../Perps/selectors/perpsController';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

const mockHandleDeeplink = jest.fn();
jest.mock('../../../../../core/DeeplinkManager', () => ({
  handleDeeplink: (...args: unknown[]) => mockHandleDeeplink(...args),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
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
      'rewards.perps_trading_campaign.open_position_cta': 'Open Position',
      'rewards.campaign_details.join_campaign': 'Join Campaign',
      'rewards.campaign.geo_locked_cta': 'Geo locked',
      'rewards.campaign.geo_locked_toast_title': 'Not available',
      'rewards.campaign.geo_locked_toast_description': 'Region restricted',
    };
    return map[key] ?? key;
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

function buildCampaign(overrides: Partial<CampaignDto> = {}): CampaignDto {
  return {
    id: 'perps-campaign-1',
    type: CampaignType.PERPS_TRADING,
    name: 'Perps Trading Campaign',
    startDate: '2025-06-01T00:00:00.000Z',
    endDate: '2026-12-31T23:59:59.999Z',
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

describe('PerpsTradingCampaignCTA', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-15T12:00:00.000Z'));
    jest.clearAllMocks();
    mockHandleDeeplink.mockResolvedValue(undefined);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEligibility) {
        return true;
      }
      return undefined;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing while participant status is loading', () => {
    const { queryByTestId } = render(
      <PerpsTradingCampaignCTA
        campaign={buildCampaign()}
        participantStatus={{ status: null, isLoading: true }}
      />,
    );

    expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
  });

  it('renders nothing when campaign is upcoming', () => {
    const { queryByTestId } = render(
      <PerpsTradingCampaignCTA
        campaign={buildCampaign({
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-12-31T23:59:59.999Z',
        })}
        participantStatus={notOptedIn}
      />,
    );

    expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
  });

  it('renders nothing when campaign is complete', () => {
    const { queryByTestId } = render(
      <PerpsTradingCampaignCTA
        campaign={buildCampaign({
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2025-01-01T00:00:00.000Z',
        })}
        participantStatus={notOptedIn}
      />,
    );

    expect(queryByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
  });

  it('when opted in, shows Open Position and calls handleDeeplink with perps market-list URL', () => {
    const { getByTestId, getByText } = render(
      <PerpsTradingCampaignCTA
        campaign={buildCampaign()}
        participantStatus={optedIn}
      />,
    );

    expect(getByText('Open Position')).toBeOnTheScreen();
    fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

    expect(mockHandleDeeplink).toHaveBeenCalledWith({
      uri: 'https://link.metamask.io/perps?screen=market-list',
    });
  });

  it('when not opted in and geo-ineligible, shows geo locked CTA and toast on press', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEligibility) {
        return false;
      }
      return undefined;
    });

    const { getByTestId, getByText } = render(
      <PerpsTradingCampaignCTA
        campaign={buildCampaign()}
        participantStatus={notOptedIn}
      />,
    );

    expect(getByText('Geo locked')).toBeOnTheScreen();
    fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

    expect(mockEntriesClosed).toHaveBeenCalledWith(
      'Not available',
      'Region restricted',
    );
    expect(mockShowToast).toHaveBeenCalledWith({ variant: 'icon' });
    expect(mockHandleDeeplink).not.toHaveBeenCalled();
  });

  it('when not opted in and eligible, shows Join Campaign and opens opt-in sheet', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <PerpsTradingCampaignCTA
        campaign={buildCampaign()}
        participantStatus={notOptedIn}
      />,
    );

    expect(queryByTestId('campaign-opt-in-sheet')).toBeNull();
    expect(getByText('Join Campaign')).toBeOnTheScreen();

    fireEvent.press(getByTestId(CAMPAIGN_CTA_TEST_IDS.CTA_BUTTON));

    expect(getByTestId('campaign-opt-in-sheet')).toBeOnTheScreen();
  });
});
