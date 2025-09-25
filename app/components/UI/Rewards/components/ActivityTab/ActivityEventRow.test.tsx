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
  // Helper to create a valid PointsEventDto for all event types
  const createMockEvent = (
    overrides: Partial<PointsEventDto> = {},
  ): PointsEventDto => {
    const eventType = overrides.type || 'SWAP';
    switch (eventType) {
      case 'SWAP':
        return {
          id: '59144-0xb204d894578dc20f72880b3e9acbe20d9f10cde061e05cbdc1c66bbf5ce37b5d',
          timestamp: new Date('2025-09-09T09:09:33.000Z'),
          type: 'SWAP' as const,
          payload: {
            srcAsset: {
              amount: '1153602',
              type: 'eip155:59144/erc20:0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
              decimals: 6,
              name: 'USD Coin',
              symbol: 'USDC',
            },
            destAsset: {
              amount: '261268688837964',
              type: 'eip155:59144/slip44:60',
              decimals: 18,
              name: 'Ether',
              symbol: 'ETH',
            },
            txHash:
              '0xb204d894578dc20f72880b3e9acbe20d9f10cde061e05cbdc1c66bbf5ce37b5d',
          },
          value: 2,
          bonus: {
            bips: 10000,
            bonuses: ['cb3a0161-ee12-49f4-a336-31063c90347e'],
          },
          accountAddress: '0x334d7bA8922c9F45422882B495b403644311Eaea',
          ...overrides,
        } as PointsEventDto;

      case 'SIGN_UP_BONUS':
        return {
          id: 'sb-0198f907-f293-7592-ba7d-41e245f96a51',
          timestamp: new Date('2025-08-30T03:31:44.444Z'),
          type: 'SIGN_UP_BONUS' as const,
          value: 250,
          bonus: {},
          accountAddress: '0x069060A475c76C77427CcC8CbD7eCB0B293f5beD',
          payload: null,
          ...overrides,
        } as PointsEventDto;

      case 'REFERRAL':
        return {
          id: '59144-0x7d75d4a6fc24667857147753486491b52fc93e1f35574cfe7cb8887f48a81b3a-referral',
          timestamp: new Date('2025-09-04T21:38:10.433Z'),
          type: 'REFERRAL' as const,
          value: 10,
          bonus: null,
          accountAddress: null,
          payload: null,
          ...overrides,
        } as PointsEventDto;

      case 'ONE_TIME_BONUS':
        return {
          id: 'lb-0x069060A475c76C77427CcC8CbD7eCB0B293f5beD-2',
          timestamp: new Date('2025-08-30T03:31:44.453Z'),
          type: 'ONE_TIME_BONUS' as const,
          value: 123,
          bonus: {},
          accountAddress: '0x069060A475c76C77427CcC8CbD7eCB0B293f5beD',
          payload: null,
          ...overrides,
        } as PointsEventDto;

      case 'PERPS':
        return {
          id: '0b15b967547b08923c088317914c7539fa1a536e8fdc7581060bc7be809bd9e7',
          timestamp: new Date('2025-08-18T03:01:46.727Z'),
          type: 'PERPS' as const,
          payload: {
            type: 'OPEN_POSITION',
            direction: 'SHORT',
            asset: {
              type: 'BIO',
              decimals: 0,
              name: 'BIO',
              symbol: 'BIO',
              iconUrl: 'https://app.hyperliquid.xyz/coins/BIO.svg',
              amount: '287',
            },
          },
          value: 1,
          bonus: {},
          accountAddress: '0xeb74cd5273ca3ECd9C30b66A1Fd14A29F754f27b',
          ...overrides,
        } as PointsEventDto;

      case 'LOYALTY_BONUS':
        return {
          id: 'stake-tx-0xfedcba987654321',
          timestamp: new Date('2025-08-13T16:45:30.000Z'),
          type: 'LOYALTY_BONUS' as const,
          value: 500,
          bonus: {
            bips: 15000,
            bonuses: ['early-staker-bonus'],
          },
          accountAddress: '0xfedcba987654321',
          payload: null,
          ...overrides,
        } as PointsEventDto;

      default:
        throw new Error(`Unsupported event type: ${eventType}`);
    }
  };

  const defaultEventDetails = {
    title: 'Swap Event',
    details: 'Swapped USDC for ETH',
    icon: IconName.Star,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEventDetails.mockReturnValue(defaultEventDetails);
    mockFormatRewardsDate.mockReturnValue('Sep 9, 2025');
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
      const event = createMockEvent({ type: 'SIGN_UP_BONUS' }); // Uses value: 250

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

    it('should display small points values correctly', () => {
      // Arrange
      const event = createMockEvent({ type: 'SWAP' }); // Uses value: 2

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('+2')).toBeOnTheScreen();
    });

    it('should display large points values correctly', () => {
      // Arrange
      const event = createMockEvent({ type: 'LOYALTY_BONUS' }); // Uses value: 500

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('+500')).toBeOnTheScreen();
    });
  });

  describe('bonus display', () => {
    it('should display high bonus percentage for SWAP events', () => {
      // Arrange
      const event = createMockEvent({ type: 'SWAP' }); // Uses bips: 10000 = 100%

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('+100%')).toBeOnTheScreen();
    });

    it('should display large bonus percentage for LOYALTY_BONUS events', () => {
      // Arrange
      const event = createMockEvent({ type: 'LOYALTY_BONUS' }); // Uses bips: 15000 = 150%

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('+150%')).toBeOnTheScreen();
    });

    it('should not display bonus when bonus is null', () => {
      // Arrange
      const event = createMockEvent({ type: 'REFERRAL' }); // Uses bonus: null

      // Act
      const { queryByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(queryByText(/\+.*%/)).toBeNull();
    });

    it('should not display bonus when bonus is empty object', () => {
      // Arrange
      const event = createMockEvent({ type: 'SIGN_UP_BONUS' }); // Uses bonus: {}

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
    it('should render SWAP event correctly', () => {
      // Arrange
      const event = createMockEvent({ type: 'SWAP' });
      mockGetEventDetails.mockReturnValue({
        title: 'Swap',
        details: 'Swapped USDC for ETH',
        icon: IconName.SwapHorizontal,
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('Swap')).toBeOnTheScreen();
      expect(getByText('Swapped USDC for ETH')).toBeOnTheScreen();
      expect(getByText('+2')).toBeOnTheScreen();
      expect(getByText('+100%')).toBeOnTheScreen();
    });

    it('should render PERPS event correctly', () => {
      // Arrange
      const event = createMockEvent({ type: 'PERPS' });
      mockGetEventDetails.mockReturnValue({
        title: 'Opened position',
        details: 'Opened SHORT BIO position',
        icon: IconName.Candlestick,
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('Opened position')).toBeOnTheScreen();
      expect(getByText('Opened SHORT BIO position')).toBeOnTheScreen();
      expect(getByText('+1')).toBeOnTheScreen();
      expect(mockGetEventDetails).toHaveBeenCalledWith(event);
    });

    it('should render SIGN_UP_BONUS event correctly', () => {
      // Arrange
      const event = createMockEvent({ type: 'SIGN_UP_BONUS' });
      mockGetEventDetails.mockReturnValue({
        title: 'Sign up bonus',
        details: 'Welcome bonus for joining',
        icon: IconName.Gift,
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('Sign up bonus')).toBeOnTheScreen();
      expect(getByText('Welcome bonus for joining')).toBeOnTheScreen();
      expect(getByText('+250')).toBeOnTheScreen();
    });

    it('should render REFERRAL event correctly', () => {
      // Arrange
      const event = createMockEvent({ type: 'REFERRAL' });
      mockGetEventDetails.mockReturnValue({
        title: 'Referral',
        details: 'Referral bonus earned',
        icon: IconName.UserCircleAdd,
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('Referral')).toBeOnTheScreen();
      expect(getByText('Referral bonus earned')).toBeOnTheScreen();
      expect(getByText('+10')).toBeOnTheScreen();
    });

    it('should render ONE_TIME_BONUS event correctly', () => {
      // Arrange
      const event = createMockEvent({ type: 'ONE_TIME_BONUS' });
      mockGetEventDetails.mockReturnValue({
        title: 'One-time bonus',
        details: 'Special bonus reward',
        icon: IconName.Star,
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('One-time bonus')).toBeOnTheScreen();
      expect(getByText('Special bonus reward')).toBeOnTheScreen();
      expect(getByText('+123')).toBeOnTheScreen();
    });

    it('should render LOYALTY_BONUS event correctly', () => {
      // Arrange
      const event = createMockEvent({ type: 'LOYALTY_BONUS' });
      mockGetEventDetails.mockReturnValue({
        title: 'Loyalty bonus',
        details: 'Early staker bonus',
        icon: IconName.Star,
      });

      // Act
      const { getByText } = render(<ActivityEventRow event={event} />);

      // Assert
      expect(getByText('Loyalty bonus')).toBeOnTheScreen();
      expect(getByText('Early staker bonus')).toBeOnTheScreen();
      expect(getByText('+500')).toBeOnTheScreen();
      expect(getByText('+150%')).toBeOnTheScreen();
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
      expect(getByText('+2')).toBeOnTheScreen();
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
      const detailsElement = getByText('Swapped USDC for ETH');
      const valueElement = getByText('+2');
      const dateElement = getByText('Sep 9, 2025');

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
