import React from 'react';
import { render } from '@testing-library/react-native';
import { ActivityEventRow } from './ActivityEventRow';
import { PointsEventDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getEventDetails, formatRewardsDate } from '../../utils/formatUtils';
import { IconName } from '@metamask/design-system-react-native';

// Mock the utility functions
jest.mock('../../utils/formatUtils', () => ({
  getEventDetails: jest.fn(),
  formatRewardsDate: jest.fn(),
}));

const mockGetEventDetails = getEventDetails as jest.MockedFunction<
  typeof getEventDetails
>;
const mockFormatRewardsDate = formatRewardsDate as jest.MockedFunction<
  typeof formatRewardsDate
>;

describe('ActivityEventRow', () => {
  const createMockEvent = (
    overrides: Partial<PointsEventDto> = {},
  ): PointsEventDto => ({
    id: 'event-1',
    type: 'SWAP',
    timestamp: new Date('2024-01-15T10:30:00Z'),
    payload: null,
    value: 100,
    bonus: null,
    accountAddress: null,
    ...overrides,
  });

  const defaultEventDetails = {
    title: 'Swap Event',
    details: 'Swapped ETH for USDC',
    icon: IconName.Star,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEventDetails.mockReturnValue(defaultEventDetails);
    mockFormatRewardsDate.mockReturnValue('Jan 15, 2024');
  });

  describe('event details display', () => {
    it('should display the event title from getEventDetails', () => {
      // Arrange
      const event = createMockEvent();
      mockGetEventDetails.mockReturnValue({
        title: 'Custom Event Title',
        details: 'Custom Event Details',
        icon: IconName.Star,
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('Custom Event Title')).toBeOnTheScreen();
      expect(getByText('Custom Event Details')).toBeOnTheScreen();
    });

    it('should display the formatted date from formatRewardsDate', () => {
      // Arrange
      const event = createMockEvent();
      mockFormatRewardsDate.mockReturnValue('Dec 25, 2023');

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('Dec 25, 2023')).toBeOnTheScreen();
    });
  });

  describe('points value display', () => {
    it('should display positive points value with + prefix', () => {
      // Arrange
      const event = createMockEvent({ value: 250 });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('+250')).toBeOnTheScreen();
    });

    it('should display zero points value without + prefix', () => {
      // Arrange
      const event = createMockEvent({ value: 0 });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('0')).toBeOnTheScreen();
    });

    it('should display large points values correctly', () => {
      // Arrange
      const event = createMockEvent({ value: 1000000 });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('+1000000')).toBeOnTheScreen();
    });
  });

  describe('bonus display', () => {
    it('should display bonus percentage when bonus.bips is provided', () => {
      // Arrange
      const event = createMockEvent({
        bonus: { bips: 500 }, // 5%
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('+5%')).toBeOnTheScreen();
    });

    it('should display bonus percentage with decimal values', () => {
      // Arrange
      const event = createMockEvent({
        bonus: { bips: 250 }, // 2.5%
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('+2.5%')).toBeOnTheScreen();
    });

    it('should not display bonus when bonus is null', () => {
      // Arrange
      const event = createMockEvent({ bonus: null });

      // Act
      const { queryByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(queryByText(/\+.*%/)).toBeNull();
    });

    it('should not display bonus when bonus.bips is 0', () => {
      // Arrange
      const event = createMockEvent({
        bonus: { bips: 0 },
      });

      // Act
      const { queryByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(queryByText(/\+.*%/)).toBeNull();
    });

    it('should not display bonus when bonus.bips is undefined', () => {
      // Arrange
      const event = createMockEvent({
        bonus: { bips: undefined },
      });

      // Act
      const { queryByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(queryByText(/\+.*%/)).toBeNull();
    });
  });

  describe('different event types', () => {
    it('should render PERPS event correctly', () => {
      // Arrange
      const event = createMockEvent({
        type: 'PERPS',
        payload: {
          type: 'OPEN_POSITION',
          token: { symbol: 'ETH', amount: 1000000, decimals: 6 },
          direction: 'LONG',
        },
      });
      mockGetEventDetails.mockReturnValue({
        title: 'Perps Position',
        details: 'Opened LONG ETH position',
        icon: IconName.Candlestick,
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('Perps Position')).toBeOnTheScreen();
      expect(getByText('Opened LONG ETH position')).toBeOnTheScreen();
      expect(getByText('+100')).toBeOnTheScreen();
    });

    it('should render SWAP event correctly', () => {
      // Arrange
      const event = createMockEvent({
        type: 'SWAP',
        payload: {
          type: 'SWAP',
          tokenIn: { symbol: 'ETH', amount: 1000000, decimals: 6 },
          tokenOut: { symbol: 'USDC', amount: 2000000, decimals: 6 },
        },
      });
      mockGetEventDetails.mockReturnValue({
        title: 'Token Swap',
        details: 'Swapped ETH for USDC',
        icon: IconName.Star,
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('Token Swap')).toBeOnTheScreen();
      expect(getByText('Swapped ETH for USDC')).toBeOnTheScreen();
      expect(getByText('+100')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('should handle events with undefined details', () => {
      // Arrange
      const event = createMockEvent();
      mockGetEventDetails.mockReturnValue({
        title: 'Event Title',
        details: undefined,
        icon: IconName.Star,
      });

      // Act
      const { getByText, queryByText } = render(
        <ActivityEventRow event={event} />,
      );

      // Assert
      expect(getByText('Event Title')).toBeOnTheScreen();
      expect(queryByText('undefined')).toBeNull();
    });

    it('should handle events with empty string details', () => {
      // Arrange
      const event = createMockEvent();
      mockGetEventDetails.mockReturnValue({
        title: 'Event Title',
        details: '',
        icon: IconName.Star,
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('Event Title')).toBeOnTheScreen();
      expect(getByText('')).toBeOnTheScreen();
    });

    it('should handle events with very long titles', () => {
      // Arrange
      const longTitle = 'A'.repeat(100);
      const event = createMockEvent();
      mockGetEventDetails.mockReturnValue({
        title: longTitle,
        details: 'Event details',
        icon: IconName.Star,
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText(longTitle)).toBeOnTheScreen();
    });

    it('should handle events with special characters in title', () => {
      // Arrange
      const specialTitle = 'Event with $pecial Ch@rs & Symbols!';
      const event = createMockEvent();
      mockGetEventDetails.mockReturnValue({
        title: specialTitle,
        details: 'Event details',
        icon: IconName.Star,
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText(specialTitle)).toBeOnTheScreen();
    });
  });

  describe('component structure', () => {
    it('should render without crashing', () => {
      // Arrange
      const event = createMockEvent();

      // Act & Assert
      expect(() => render(<ActivityEventRow event={event} />)).not.toThrow();
    });

    it('should render with minimal required props', () => {
      // Arrange
      const minimalEvent = createMockEvent();

      // Act
      const { getByText } = render(<ActivityEventRow event={minimalEvent} />);

      // Assert
      expect(getByText('Swap Event')).toBeOnTheScreen();
      expect(getByText('+100')).toBeOnTheScreen();
    });
  });

  describe('accessibility', () => {
    it('should render text elements that are accessible', () => {
      // Arrange
      const event = createMockEvent();

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      const titleElement = getByText('Swap Event');
      const detailsElement = getByText('Swapped ETH for USDC');
      const valueElement = getByText('+100');
      const dateElement = getByText('Jan 15, 2024');

      expect(titleElement).toBeOnTheScreen();
      expect(detailsElement).toBeOnTheScreen();
      expect(valueElement).toBeOnTheScreen();
      expect(dateElement).toBeOnTheScreen();
    });
  });

  describe('integration with utility functions', () => {
    it('should handle getEventDetails returning different icon types', () => {
      // Arrange
      const event = createMockEvent();
      mockGetEventDetails.mockReturnValue({
        title: 'Test Event',
        details: 'Test details',
        icon: IconName.Star,
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('Test Event')).toBeOnTheScreen();
      expect(mockGetEventDetails).toHaveBeenCalledWith(event);
    });

    it('should handle formatRewardsDate returning different date formats', () => {
      // Arrange
      const event = createMockEvent();
      mockFormatRewardsDate.mockReturnValue('15/01/2024');

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('15/01/2024')).toBeOnTheScreen();
      expect(mockFormatRewardsDate).toHaveBeenCalledWith(
        event.timestamp.getTime(),
      );
    });
  });
});
