import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { GenericEventDetails } from './GenericEventDetails';
import { AvatarAccountType } from '../../../../../../../component-library/components/Avatars/Avatar';
import TEST_ADDRESS from '../../../../../../../constants/address';
import { PointsEventDto } from '../../../../../../../core/Engine/controllers/rewards-controller/types';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock i18n strings
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

// Mock format utils
jest.mock('../../../../utils/formatUtils', () => ({
  formatRewardsDate: jest.fn(() => 'Sep 9, 2025'),
  formatNumber: jest.fn((n: number) => n.toString()),
}));

// Mock SVG used in the component to avoid native rendering issues
jest.mock(
  '../../../../../../../images/rewards/metamask-rewards-points.svg',
  () => 'SvgMock',
);

describe('GenericEventDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(AvatarAccountType.JazzIcon);
  });

  const baseEvent: PointsEventDto = {
    id: 'test-id',
    timestamp: new Date('2025-09-09T09:09:33.000Z'),
    type: 'SWAP',
    payload: null,
    value: 1000,
    bonus: { bonusPoints: 250, bips: 0, bonuses: [] },
    accountAddress: TEST_ADDRESS,
    updatedAt: new Date('2025-09-09T09:09:33.000Z'),
  } as unknown as PointsEventDto;

  it('renders date, account and points with boost', () => {
    render(
      <GenericEventDetails event={baseEvent} accountName="Primary Account" />,
    );

    // Headers
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText('Points')).toBeTruthy();

    // Date row
    expect(screen.getByText('Date')).toBeTruthy();
    expect(screen.getByText('Sep 9, 2025')).toBeTruthy();

    // Account row
    expect(screen.getByText('Account')).toBeTruthy();
    expect(screen.getByText('Primary Account')).toBeTruthy();

    // Points rows
    // Base = value - bonus = 1000 - 250 = 750
    expect(screen.getByText('Base')).toBeTruthy();
    expect(screen.getByText('750')).toBeTruthy();
    // Boost
    expect(screen.getByText('Boost')).toBeTruthy();
    expect(screen.getByText('250')).toBeTruthy();
    // Total
    expect(screen.getByText('Total')).toBeTruthy();
    expect(screen.getByText('1000')).toBeTruthy();
  });

  it('hides boost row when no bonus points', () => {
    const eventNoBonus: PointsEventDto = {
      ...baseEvent,
      value: 500,
      bonus: null,
    } as unknown as PointsEventDto;

    render(<GenericEventDetails event={eventNoBonus} accountName="A" />);

    // Base = 500
    expect(screen.getByText('Base')).toBeTruthy();
    // Appears twice: base and total
    expect(screen.getAllByText('500')).toHaveLength(2);

    // No boost label when no bonus
    expect(screen.queryByText('Boost')).toBeNull();
  });
});
