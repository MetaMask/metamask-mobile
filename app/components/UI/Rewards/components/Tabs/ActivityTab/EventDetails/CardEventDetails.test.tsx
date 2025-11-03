import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { CardEventDetails } from './CardEventDetails';
import { AvatarAccountType } from '../../../../../../../component-library/components/Avatars/Avatar';
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

// Mock eventDetailsUtils
jest.mock('../../../../utils/eventDetailsUtils', () => ({
  formatAssetAmount: jest.fn((amount: string, decimals: number) => {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    return num.toLocaleString('en-US', { maximumFractionDigits: decimals });
  }),
}));

// Mock SVG used in the component to avoid native rendering issues
jest.mock(
  '../../../../../../../images/rewards/metamask-rewards-points.svg',
  () => 'SvgMock',
);

describe('CardEventDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(AvatarAccountType.JazzIcon);
  });

  const baseCardEvent: Extract<PointsEventDto, { type: 'CARD' }> = {
    id: 'card-event-1',
    timestamp: new Date('2025-09-09T09:09:33.000Z'),
    type: 'CARD',
    value: 15,
    bonus: { bips: 5000, bonuses: ['card-bonus-1'], bonusPoints: null },
    accountAddress: '0x069060A475c76C77427CcC8CbD7eCB0B293f5beD',
    updatedAt: new Date('2025-09-09T09:09:33.000Z'),
    payload: {
      asset: {
        amount: '43250000',
        type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        decimals: 6,
        name: 'USD Coin',
        symbol: 'USDC',
      },
      txHash: '0xabc123def456789012345678901234567890abcd',
    },
  };

  it('renders amount row with formatted card spend amount', () => {
    render(<CardEventDetails event={baseCardEvent} accountName="Primary" />);

    // Verify GenericEventDetails header is rendered
    expect(screen.getByText('Details')).toBeTruthy();

    // Verify amount label and value are displayed
    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.getByText('43.25 USDC')).toBeTruthy();
  });

  it('renders without amount row when payload is null', () => {
    const eventWithoutPayload: Extract<PointsEventDto, { type: 'CARD' }> = {
      ...baseCardEvent,
      payload: null,
    };

    render(
      <CardEventDetails event={eventWithoutPayload} accountName="Primary" />,
    );

    // Verify GenericEventDetails content is rendered
    expect(screen.getByText('Details')).toBeTruthy();

    // Verify amount row is not displayed when payload is null
    expect(screen.queryByText('Amount')).toBeNull();
  });

  it('renders base points and total correctly', () => {
    const eventWithBonus: Extract<PointsEventDto, { type: 'CARD' }> = {
      ...baseCardEvent,
      value: 500,
      bonus: { bonusPoints: 100, bips: 0, bonuses: [] },
      payload: {
        asset: {
          amount: '256750000',
          type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC',
        },
        txHash: '0xabc123def456789012345678901234567890abcd',
      },
    };

    render(<CardEventDetails event={eventWithBonus} accountName="Primary" />);

    // Verify points section from GenericEventDetails
    expect(screen.getByText('Points')).toBeTruthy();

    // Base = value - bonus = 500 - 100 = 400
    expect(screen.getByText('Base')).toBeTruthy();
    expect(screen.getByText('400')).toBeTruthy();

    // Boost
    expect(screen.getByText('Boost')).toBeTruthy();
    expect(screen.getByText('100')).toBeTruthy();

    // Total
    expect(screen.getByText('Total')).toBeTruthy();
    expect(screen.getByText('500')).toBeTruthy();
  });

  it('displays account name when provided', () => {
    render(
      <CardEventDetails event={baseCardEvent} accountName="Spending Account" />,
    );

    // Verify account name is displayed
    expect(screen.getByText('Account')).toBeTruthy();
    expect(screen.getByText('Spending Account')).toBeTruthy();
  });

  it('handles zero amount correctly', () => {
    const eventWithZeroAmount: Extract<PointsEventDto, { type: 'CARD' }> = {
      ...baseCardEvent,
      payload: {
        asset: {
          amount: '0',
          type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          decimals: 6,
          name: 'USD Coin',
          symbol: 'USDC',
        },
        txHash: '0xabc123def456789012345678901234567890abcd',
      },
    };

    render(
      <CardEventDetails event={eventWithZeroAmount} accountName="Primary" />,
    );

    // Amount should still be displayed even when zero
    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.getByText('0 USDC')).toBeTruthy();
  });
});
