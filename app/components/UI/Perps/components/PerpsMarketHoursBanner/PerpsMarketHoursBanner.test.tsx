import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketHoursBanner from './PerpsMarketHoursBanner';
import { getMarketHoursStatus, isEquityAsset } from '../../utils/marketHours';

// Mock the market hours utilities
jest.mock('../../utils/marketHours');

describe('PerpsMarketHoursBanner', () => {
  const mockOnInfoPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for getMarketHoursStatus
    (getMarketHoursStatus as jest.Mock).mockReturnValue({
      isOpen: true,
      nextTransition: new Date(),
      countdownText: '2 hours, 30 minutes',
    });
  });

  describe('rendering', () => {
    it('should not render for non-equity assets', () => {
      (isEquityAsset as jest.Mock).mockReturnValue(false);

      const { queryByTestId } = render(
        <PerpsMarketHoursBanner
          marketType="crypto"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(queryByTestId('perps-market-hours-banner')).toBeNull();
    });

    it('should render for equity assets', () => {
      (isEquityAsset as jest.Mock).mockReturnValue(true);

      const { getByTestId } = render(
        <PerpsMarketHoursBanner
          marketType="equity"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(getByTestId('perps-market-hours-banner')).toBeTruthy();
    });

    it('should use custom testID when provided', () => {
      (isEquityAsset as jest.Mock).mockReturnValue(true);

      const { getByTestId } = render(
        <PerpsMarketHoursBanner
          marketType="equity"
          onInfoPress={mockOnInfoPress}
          testID="custom-banner-id"
        />,
      );

      expect(getByTestId('custom-banner-id')).toBeTruthy();
    });
  });

  describe('market hours open', () => {
    beforeEach(() => {
      (isEquityAsset as jest.Mock).mockReturnValue(true);
      (getMarketHoursStatus as jest.Mock).mockReturnValue({
        isOpen: true,
        nextTransition: new Date(),
        countdownText: '2 hours, 30 minutes',
      });
    });

    it('should display 24/7 trading message when market is open', () => {
      const { getByText } = render(
        <PerpsMarketHoursBanner
          marketType="equity"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(getByText('This asset may be traded 24/7')).toBeTruthy();
    });

    it('should display volatility warning when market is open', () => {
      const { getByText } = render(
        <PerpsMarketHoursBanner
          marketType="equity"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(
        getByText('Expect more volatility outside of market hours'),
      ).toBeTruthy();
    });
  });

  describe('market hours closed', () => {
    beforeEach(() => {
      (isEquityAsset as jest.Mock).mockReturnValue(true);
      (getMarketHoursStatus as jest.Mock).mockReturnValue({
        isOpen: false,
        nextTransition: new Date(),
        countdownText: '15 hours, 30 minutes',
      });
    });

    it('should display after-hours trading message when market is closed', () => {
      const { getByText } = render(
        <PerpsMarketHoursBanner
          marketType="equity"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(getByText('After-hours trading')).toBeTruthy();
    });

    it('should display slippage warning when market is closed', () => {
      const { getByText } = render(
        <PerpsMarketHoursBanner
          marketType="equity"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(
        getByText('Pay attention to volatility and slippage'),
      ).toBeTruthy();
    });
  });

  describe('info button interaction', () => {
    beforeEach(() => {
      (isEquityAsset as jest.Mock).mockReturnValue(true);
    });

    it('should call onInfoPress when info button is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketHoursBanner
          marketType="equity"
          onInfoPress={mockOnInfoPress}
        />,
      );

      const infoButton = getByTestId('perps-market-hours-banner-info-button');
      fireEvent.press(infoButton);

      expect(mockOnInfoPress).toHaveBeenCalledTimes(1);
    });

    it('should render info button for both market states', () => {
      // Test open state
      (getMarketHoursStatus as jest.Mock).mockReturnValue({
        isOpen: true,
        nextTransition: new Date(),
        countdownText: '2 hours',
      });

      const { getByTestId, rerender } = render(
        <PerpsMarketHoursBanner
          marketType="equity"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(getByTestId('perps-market-hours-banner-info-button')).toBeTruthy();

      // Test closed state
      (getMarketHoursStatus as jest.Mock).mockReturnValue({
        isOpen: false,
        nextTransition: new Date(),
        countdownText: '15 hours',
      });

      rerender(
        <PerpsMarketHoursBanner
          marketType="equity"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(getByTestId('perps-market-hours-banner-info-button')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      (isEquityAsset as jest.Mock).mockReturnValue(true);
    });

    it('should have proper hit slop for info button', () => {
      const { getByTestId } = render(
        <PerpsMarketHoursBanner
          marketType="equity"
          onInfoPress={mockOnInfoPress}
        />,
      );

      const infoButton = getByTestId('perps-market-hours-banner-info-button');
      expect(infoButton.props.hitSlop).toEqual({
        top: 10,
        bottom: 10,
        left: 10,
        right: 10,
      });
    });
  });
});
