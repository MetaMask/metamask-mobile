import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampaignTile from './CampaignTile';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getCampaignStatusInfo } from './CampaignTile.utils';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('./CampaignTile.utils', () => ({
  getCampaignStatusInfo: jest.fn().mockReturnValue({
    status: 'active',
    statusLabel: 'Active',
    statusDescription: 'Ends Mar 15, 2:30 PM',
    statusDescriptionIcon: 'Clock',
  }),
}));

const createTestCampaign = (overrides = {}): CampaignDto => ({
  id: 'campaign-1',
  type: CampaignType.ONDO_HOLDING,
  name: 'Test Campaign',
  startDate: '2027-01-01T00:00:00.000Z',
  endDate: '2027-12-31T23:59:59.999Z',
  termsAndConditions: null,
  excludedRegions: [],
  statusLabel: 'Active',
  participantCount: 0,
  details: null,
  ...overrides,
});

describe('CampaignTile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCampaignStatusInfo as jest.Mock).mockReturnValue({
      status: 'active',
      statusLabel: 'Active',
      statusDescription: 'Ends Mar 15, 2:30 PM',
      statusDescriptionIcon: 'Clock',
    });
  });

  it('renders campaign name', () => {
    const campaign = createTestCampaign({ name: 'My Campaign' });

    const { getByText } = render(<CampaignTile campaign={campaign} />);

    expect(getByText('My Campaign')).toBeOnTheScreen();
  });

  it('renders status label and description', () => {
    const campaign = createTestCampaign();

    const { getByText } = render(<CampaignTile campaign={campaign} />);

    expect(getByText('Active')).toBeOnTheScreen();
    expect(getByText('Ends Mar 15, 2:30 PM')).toBeOnTheScreen();
  });

  it('calls getCampaignStatusInfo with campaign', () => {
    const campaign = createTestCampaign();

    render(<CampaignTile campaign={campaign} />);

    expect(getCampaignStatusInfo).toHaveBeenCalledWith(campaign);
  });

  it('navigates to campaign details on press', () => {
    const campaign = createTestCampaign();

    const { getByTestId } = render(<CampaignTile campaign={campaign} />);
    fireEvent.press(getByTestId(`campaign-tile-${campaign.id}`));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CAMPAIGN_DETAILS, {
      campaign,
    });
  });
});
