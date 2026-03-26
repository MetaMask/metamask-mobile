import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignJoinCTA, { CAMPAIGN_JOIN_CTA_TEST_IDS } from './CampaignJoinCTA';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

const mockShowToast = jest.fn();
const mockEntriesClosed = jest.fn((title: string, subtitle?: string) => ({
  title,
  subtitle,
  preset: 'entriesClosed',
}));

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

jest.mock('@react-navigation/native', () => {
  const React = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = effect();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [effect]);
    },
  };
});

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

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'rewards.campaign_details.join_campaign': 'Join Campaign',
      'rewards.campaign_details.checking_opt_in_status': 'Checking...',
      'rewards.campaign_details.entries_closed_title': 'Entries closed',
      'rewards.campaign_details.entries_closed_description': 'Missed window',
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

describe('CampaignJoinCTA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultParticipant = {
    status: { optedIn: false, participantCount: 0 } as const,
    isLoading: false,
  };

  it('renders the join CTA when the campaign is active, user is not opted in, and opt-in is allowed', () => {
    const { getByTestId, getByText } = render(
      <CampaignJoinCTA
        campaign={buildCampaign()}
        participantStatus={defaultParticipant}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON),
    ).toBeOnTheScreen();
    expect(getByText('Join Campaign')).toBeOnTheScreen();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('shows checking label while participant status is loading', () => {
    const { getByText } = render(
      <CampaignJoinCTA
        campaign={buildCampaign()}
        participantStatus={{
          status: null,
          isLoading: true,
        }}
      />,
    );

    expect(getByText('Checking...')).toBeTruthy();
  });

  it('renders nothing when the user has already opted in', () => {
    const { queryByTestId } = render(
      <CampaignJoinCTA
        campaign={buildCampaign()}
        participantStatus={{
          status: { optedIn: true, participantCount: 1 },
          isLoading: false,
        }}
      />,
    );

    expect(queryByTestId(CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('renders nothing when the campaign is not active', () => {
    const { queryByTestId } = render(
      <CampaignJoinCTA
        campaign={buildCampaign({
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-12-31T23:59:59.999Z',
        })}
        participantStatus={defaultParticipant}
      />,
    );

    expect(queryByTestId(CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
  });

  it('renders nothing when entries are closed but shows the entries-closed toast once', () => {
    jest.setSystemTime(new Date('2025-08-10T12:00:00.000Z'));

    const campaign = buildCampaign({
      details: {
        howItWorks: { title: 'How', description: 'Desc', steps: [] },
        depositCutoffDate: '2025-08-01T00:00:00.000Z',
      },
    });

    const { queryByTestId, rerender } = render(
      <CampaignJoinCTA
        campaign={campaign}
        participantStatus={defaultParticipant}
      />,
    );

    expect(queryByTestId(CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockEntriesClosed).toHaveBeenCalledWith(
      'Entries closed',
      'Missed window',
    );

    rerender(
      <CampaignJoinCTA
        campaign={campaign}
        participantStatus={defaultParticipant}
      />,
    );
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });

  it('does not show the entries-closed toast while participant status is still loading', () => {
    jest.setSystemTime(new Date('2025-08-10T12:00:00.000Z'));

    const campaign = buildCampaign({
      details: {
        howItWorks: { title: 'How', description: 'Desc', steps: [] },
        depositCutoffDate: '2025-08-01T00:00:00.000Z',
      },
    });

    const { rerender, queryByTestId } = render(
      <CampaignJoinCTA
        campaign={campaign}
        participantStatus={{ status: null, isLoading: true }}
      />,
    );

    expect(mockShowToast).not.toHaveBeenCalled();

    rerender(
      <CampaignJoinCTA
        campaign={campaign}
        participantStatus={defaultParticipant}
      />,
    );

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(queryByTestId(CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
  });

  it('opens the opt-in sheet when the join button is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <CampaignJoinCTA
        campaign={buildCampaign()}
        participantStatus={defaultParticipant}
      />,
    );

    expect(queryByTestId('campaign-opt-in-sheet')).toBeNull();
    fireEvent.press(getByTestId(CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON));
    expect(getByTestId('campaign-opt-in-sheet')).toBeOnTheScreen();
  });
});
