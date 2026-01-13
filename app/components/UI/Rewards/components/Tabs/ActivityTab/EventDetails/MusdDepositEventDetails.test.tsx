import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { MusdDepositEventDetails } from './MusdDepositEventDetails';
import { AvatarAccountType } from '../../../../../../../component-library/components/Avatars/Avatar';
import TEST_ADDRESS from '../../../../../../../constants/address';
import { PointsEventDto } from '../../../../../../../core/Engine/controllers/rewards-controller/types';
import { formatRewardsMusdDepositPayloadDate } from '../../../../utils/formatUtils';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock i18n strings used by GenericEventDetails and MusdDepositEventDetails
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
      'rewards.events.for_deposit_period': 'For deposit period',
    };
    return t[key] || key;
  }),
}));

// Mock format utils used by GenericEventDetails and MusdDepositEventDetails
jest.mock('../../../../utils/formatUtils', () => ({
  formatRewardsDate: jest.fn(() => 'Sep 9, 2025'),
  formatNumber: jest.fn((n: number) => n.toString()),
  formatRewardsMusdDepositPayloadDate: jest.fn(
    (isoDate: string | undefined) => {
      // Mock implementation that matches the real implementation behavior
      if (
        !isoDate ||
        typeof isoDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)
      ) {
        return null;
      }
      const date = new Date(`${isoDate}T00:00:00Z`);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(date);
    },
  ),
}));

// Mock SVG used in the component to avoid native rendering issues
jest.mock(
  '../../../../../../../images/rewards/metamask-rewards-points.svg',
  () => 'SvgMock',
);

describe('MusdDepositEventDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(AvatarAccountType.JazzIcon);
  });

  const baseMusdDepositEvent: Extract<
    PointsEventDto,
    { type: 'MUSD_DEPOSIT' }
  > = {
    id: 'musd-deposit-1',
    timestamp: new Date('2025-09-09T09:09:33.000Z'),
    type: 'MUSD_DEPOSIT',
    value: 100,
    bonus: null,
    accountAddress: TEST_ADDRESS,
    updatedAt: new Date('2025-09-09T09:09:33.000Z'),
    payload: {
      date: '2025-11-11',
    },
  };

  it('renders deposit period row when payload.date exists', () => {
    render(
      <MusdDepositEventDetails
        event={baseMusdDepositEvent}
        accountName="Primary"
      />,
    );

    // Verify GenericEventDetails header is rendered
    expect(screen.getByText('Details')).toBeTruthy();

    // Verify deposit period label and formatted date are displayed
    expect(screen.getByText('For deposit period')).toBeTruthy();
    expect(screen.getByText('Nov 11, 2025')).toBeTruthy();
  });

  it('does not render deposit period row when payload is null', () => {
    const eventWithoutPayload: Extract<
      PointsEventDto,
      { type: 'MUSD_DEPOSIT' }
    > = {
      ...baseMusdDepositEvent,
      payload: null,
    };

    render(
      <MusdDepositEventDetails
        event={eventWithoutPayload}
        accountName="Primary"
      />,
    );

    // Verify GenericEventDetails content is rendered
    expect(screen.getByText('Details')).toBeTruthy();

    // Verify deposit period row is not displayed when payload is null
    expect(screen.queryByText('For deposit period')).toBeNull();
  });

  it('renders base points and total correctly', () => {
    const eventWithBonus: Extract<PointsEventDto, { type: 'MUSD_DEPOSIT' }> = {
      ...baseMusdDepositEvent,
      value: 500,
      bonus: { bonusPoints: 100, bips: 0, bonuses: [] },
    };

    render(
      <MusdDepositEventDetails event={eventWithBonus} accountName="Primary" />,
    );

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
      <MusdDepositEventDetails
        event={baseMusdDepositEvent}
        accountName="Deposit Account"
      />,
    );

    // Verify account name is displayed
    expect(screen.getByText('Account')).toBeTruthy();
    expect(screen.getByText('Deposit Account')).toBeTruthy();
  });

  it('calls formatRewardsMusdDepositPayloadDate with correct ISO date string', () => {
    const mockFormatRewardsMusdDepositPayloadDate =
      formatRewardsMusdDepositPayloadDate as jest.MockedFunction<
        typeof formatRewardsMusdDepositPayloadDate
      >;
    mockFormatRewardsMusdDepositPayloadDate.mockReturnValue('Dec 25, 2025');

    const eventWithDate: Extract<PointsEventDto, { type: 'MUSD_DEPOSIT' }> = {
      ...baseMusdDepositEvent,
      payload: {
        date: '2025-12-25',
      },
    };

    render(
      <MusdDepositEventDetails event={eventWithDate} accountName="Primary" />,
    );

    // Verify the formatter was called with the correct ISO date string
    expect(mockFormatRewardsMusdDepositPayloadDate).toHaveBeenCalledWith(
      '2025-12-25',
    );

    // Verify the formatted date is displayed
    expect(screen.getByText('Dec 25, 2025')).toBeTruthy();
  });
});
