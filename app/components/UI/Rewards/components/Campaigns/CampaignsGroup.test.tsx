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

jest.mock('../PreviousSeason/PreviousSeasonTile', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactActual.createElement(Text, null, 'PreviousSeasonTile'),
  };
});

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

describe('CampaignsGroup', () => {
  beforeEach(() => {
    mockUseSelector.mockReturnValue(null);
  });

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

  it('renders PreviousSeasonTile when displayPreviousSeason is true and seasonName exists', () => {
    mockUseSelector.mockReturnValue('Season 1');

    const { getByText } = render(
      <CampaignsGroup title="Previous" campaigns={[]} displayPreviousSeason />,
    );

    expect(getByText('Previous')).toBeOnTheScreen();
    expect(getByText('PreviousSeasonTile')).toBeOnTheScreen();
  });

  it('returns null when displayPreviousSeason is true but seasonName is empty', () => {
    mockUseSelector.mockReturnValue(null);

    const { queryByText } = render(
      <CampaignsGroup title="Previous" campaigns={[]} displayPreviousSeason />,
    );

    expect(queryByText('Previous')).toBeNull();
    expect(queryByText('PreviousSeasonTile')).toBeNull();
  });

  it('does not render PreviousSeasonTile when displayPreviousSeason is false', () => {
    mockUseSelector.mockReturnValue('Season 1');

    const campaigns = [createTestCampaign({ id: '1', name: 'Campaign One' })];

    const { queryByText } = render(
      <CampaignsGroup title="Active" campaigns={campaigns} />,
    );

    expect(queryByText('PreviousSeasonTile')).toBeNull();
  });
});
