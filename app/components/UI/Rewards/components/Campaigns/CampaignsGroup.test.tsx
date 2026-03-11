import React from 'react';
import { render } from '@testing-library/react-native';
import CampaignsGroup from './CampaignsGroup';
import type {
  CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

const createTestCampaign = (
  overrides: Partial<CampaignDto> = {},
): CampaignDto => ({
  id: 'campaign-1',
  type: 'ONDO_HOLDING' as CampaignType,
  name: 'Test Campaign',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2027-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  statusLabel: 'Active',
  participantCount: 0,
  details: null,
  ...overrides,
});

jest.mock('./CampaignTile', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ campaign }: { campaign: { name: string } }) =>
      ReactActual.createElement(Text, null, campaign.name),
  };
});

describe('CampaignsGroup', () => {
  it('renders title and campaign tiles', () => {
    const campaigns = [
      createTestCampaign({ id: '1', name: 'Campaign One' }),
      createTestCampaign({ id: '2', name: 'Campaign Two' }),
    ];

    const { getByText } = render(
      <CampaignsGroup title="Active Campaigns" campaigns={campaigns} />,
    );

    expect(getByText('Active Campaigns')).toBeOnTheScreen();
    expect(getByText('Campaign One')).toBeOnTheScreen();
    expect(getByText('Campaign Two')).toBeOnTheScreen();
  });

  it('returns null when campaigns array is empty', () => {
    const { queryByText } = render(
      <CampaignsGroup title="Active Campaigns" campaigns={[]} />,
    );

    expect(queryByText('Active Campaigns')).toBeNull();
    expect(queryByText('Test Campaign')).toBeNull();
  });
});
