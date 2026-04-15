import React from 'react';
import { render } from '@testing-library/react-native';
import CampaignsGroup from './CampaignsGroup';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

const createTestCampaign = (
  overrides: Partial<CampaignDto> = {},
): CampaignDto => ({
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test Campaign',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2027-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  details: null,
  featured: true,
  ...overrides,
});

jest.mock('./CampaignTile', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const { isCampaignTypeSupported } = jest.requireActual(
    './CampaignTile.utils',
  );
  return {
    __esModule: true,
    default: ({ campaign }: { campaign: { name: string; type: string } }) => {
      const isInteractive = isCampaignTypeSupported(campaign.type);
      return ReactActual.createElement(
        Text,
        { testID: isInteractive ? 'interactive' : 'non-interactive' },
        campaign.name,
      );
    },
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

  it('renders campaigns with supported types as interactive', () => {
    const campaigns = [
      createTestCampaign({
        id: '1',
        name: 'Ondo Campaign',
        type: CampaignType.ONDO_HOLDING,
      }),
    ];

    const { getByTestId } = render(
      <CampaignsGroup title="Active" campaigns={campaigns} />,
    );

    expect(getByTestId('interactive')).toBeOnTheScreen();
  });

  it('renders SEASON_1 campaigns as interactive', () => {
    const campaigns = [
      createTestCampaign({
        id: '1',
        name: 'Season 1 Campaign',
        type: CampaignType.SEASON_1,
      }),
    ];

    const { getByTestId } = render(
      <CampaignsGroup title="Previous" campaigns={campaigns} />,
    );

    expect(getByTestId('interactive')).toBeOnTheScreen();
  });

  it('renders campaigns with unsupported types as non-interactive', () => {
    const campaigns = [
      createTestCampaign({
        id: '1',
        name: 'Unknown Campaign',
        type: 'UNKNOWN_TYPE' as CampaignType,
      }),
    ];

    const { getByTestId } = render(
      <CampaignsGroup title="Previous" campaigns={campaigns} />,
    );

    expect(getByTestId('non-interactive')).toBeOnTheScreen();
  });
});
