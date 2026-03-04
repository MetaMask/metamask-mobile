import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { BonusCodeEventDetails } from './BonusCodeEventDetails';
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
      'rewards.events.code': 'Code',
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

// Mock SVG used in the component to avoid native rendering issues
jest.mock(
  '../../../../../../../images/rewards/metamask-rewards-points.svg',
  () => 'SvgMock',
);

describe('BonusCodeEventDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(AvatarAccountType.JazzIcon);
  });

  const bonusCodeEvent: Extract<PointsEventDto, { type: 'BONUS_CODE' }> = {
    id: 'bonus-1',
    timestamp: new Date('2025-09-09T09:09:33.000Z'),
    type: 'BONUS_CODE',
    value: 500,
    bonus: null,
    accountAddress: TEST_ADDRESS,
    updatedAt: new Date('2025-09-09T09:09:33.000Z'),
    payload: {
      code: 'BNS123',
    },
  };

  it('renders code row with bonus code from payload', () => {
    render(
      <BonusCodeEventDetails event={bonusCodeEvent} accountName="Primary" />,
    );

    expect(screen.getByText('Details')).toBeOnTheScreen();
    expect(screen.getByText('Code')).toBeOnTheScreen();
    expect(screen.getByText('BNS123')).toBeOnTheScreen();
  });

  it('renders generic details without code row when payload is null', () => {
    const eventWithNullPayload = {
      ...bonusCodeEvent,
      payload: null,
    };

    render(
      <BonusCodeEventDetails
        event={eventWithNullPayload}
        accountName="Primary"
      />,
    );

    expect(screen.getByText('Details')).toBeOnTheScreen();
    expect(screen.queryByText('Code')).toBeNull();
  });

  it('renders points section', () => {
    render(
      <BonusCodeEventDetails event={bonusCodeEvent} accountName="Primary" />,
    );

    expect(screen.getByText('Points')).toBeOnTheScreen();
    expect(screen.getByText('Total')).toBeOnTheScreen();
    expect(screen.getAllByText('500').length).toBeGreaterThanOrEqual(1);
  });
});
