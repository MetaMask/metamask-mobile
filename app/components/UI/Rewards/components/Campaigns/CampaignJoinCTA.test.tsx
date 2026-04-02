import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignJoinCTA, { CAMPAIGN_JOIN_CTA_TEST_IDS } from './CampaignJoinCTA';
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

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'rewards.campaign_details.join_campaign': 'Join Campaign',
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
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-15T12:00:00.000Z'));
    jest.clearAllMocks();
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
        onOptInPress={jest.fn()}
      />,
    );

    expect(
      getByTestId(CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON),
    ).toBeOnTheScreen();
    expect(getByText('Join Campaign')).toBeOnTheScreen();
  });

  it('renders nothing while participant status is loading', () => {
    const { queryByTestId } = render(
      <CampaignJoinCTA
        campaign={buildCampaign()}
        participantStatus={{ status: null, isLoading: true }}
        onOptInPress={jest.fn()}
      />,
    );

    expect(queryByTestId(CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
  });

  it('renders nothing when the user has already opted in', () => {
    const { queryByTestId } = render(
      <CampaignJoinCTA
        campaign={buildCampaign()}
        participantStatus={{
          status: { optedIn: true, participantCount: 1 },
          isLoading: false,
        }}
        onOptInPress={jest.fn()}
      />,
    );

    expect(queryByTestId(CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
  });

  it('renders nothing when the campaign is not active', () => {
    const { queryByTestId } = render(
      <CampaignJoinCTA
        campaign={buildCampaign({
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-12-31T23:59:59.999Z',
        })}
        participantStatus={defaultParticipant}
        onOptInPress={jest.fn()}
      />,
    );

    expect(queryByTestId(CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
  });

  it('renders nothing when entries are closed (past deposit cutoff)', () => {
    const { queryByTestId } = render(
      <CampaignJoinCTA
        campaign={buildCampaign({
          details: {
            howItWorks: { title: 'How', description: 'Desc', steps: [] },
            depositCutoffDate: '2025-08-01T00:00:00.000Z',
          },
        })}
        participantStatus={defaultParticipant}
        onOptInPress={jest.fn()}
      />,
    );

    expect(queryByTestId(CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON)).toBeNull();
  });

  it('calls onOptInPress when the join button is pressed', () => {
    const mockOnOptInPress = jest.fn();
    const { getByTestId } = render(
      <CampaignJoinCTA
        campaign={buildCampaign()}
        participantStatus={defaultParticipant}
        onOptInPress={mockOnOptInPress}
      />,
    );

    fireEvent.press(getByTestId(CAMPAIGN_JOIN_CTA_TEST_IDS.CTA_BUTTON));
    expect(mockOnOptInPress).toHaveBeenCalledTimes(1);
  });
});
