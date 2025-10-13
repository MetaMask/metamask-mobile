import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { SwapEventDetails } from './SwapEventDetails';
import { AvatarAccountType } from '../../../../../../../component-library/components/Avatars/Avatar';
import TEST_ADDRESS from '../../../../../../../constants/address';
import { PointsEventDto } from '../../../../../../../core/Engine/controllers/rewards-controller/types';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock i18n strings used by GenericEventDetails
jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const t: Record<string, string> = {
      'rewards.events.details': 'Details',
      'rewards.events.date': 'Date',
      'rewards.events.account': 'Account',
      'rewards.events.points': 'Points',
      'rewards.events.points_base': 'Base',
      'rewards.events.points_boost': 'Boost',
      'rewards.events.points_total': 'Total',
    };
    return t[key] || key;
  }),
}));

// Mock format utils used by GenericEventDetails
jest.mock('../../../../utils/formatUtils', () => ({
  formatRewardsDate: jest.fn(() => 'Sep 9, 2025'),
  formatNumber: jest.fn((n: number) => n.toString()),
}));

// Mock formatSwapDetails used by SwapEventDetails
jest.mock('../../../../utils/eventDetailsUtils', () => ({
  formatSwapDetails: jest.fn(() => '1 ETH to 1 USDC'),
}));

// Mock SVG used in the component to avoid native rendering issues
jest.mock(
  '../../../../../../../images/rewards/metamask-rewards-points.svg',
  () => 'SvgMock',
);

describe('SwapEventDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(AvatarAccountType.JazzIcon);
  });

  const swapEvent: Extract<PointsEventDto, { type: 'SWAP' }> = {
    id: 'swap-1',
    timestamp: new Date('2025-09-09T09:09:33.000Z'),
    type: 'SWAP',
    value: 100,
    bonus: null,
    accountAddress: TEST_ADDRESS,
    updatedAt: new Date('2025-09-09T09:09:33.000Z'),
    payload: {
      srcAsset: {
        amount: '1000000000000000000',
        decimals: 18,
        symbol: 'ETH',
        type: 'eip155:1/slip44:60',
      },
      destAsset: {
        amount: '1000000',
        decimals: 6,
        symbol: 'USDC',
        type: 'eip155:1/erc20:0xa0b8...e48',
      },
    },
  };

  it('renders asset row with formatted swap details', () => {
    render(<SwapEventDetails event={swapEvent} accountName="Primary" />);

    // From GenericEventDetails header
    expect(screen.getByText('Details')).toBeTruthy();
    // Asset label and formatted value
    expect(screen.getByText('Asset')).toBeTruthy();
    expect(screen.getByText('1 ETH to 1 USDC')).toBeTruthy();
  });
});
