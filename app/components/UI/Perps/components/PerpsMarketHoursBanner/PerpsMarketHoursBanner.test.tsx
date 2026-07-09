import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsMarketHoursBanner from './PerpsMarketHoursBanner';
import { getMarketHoursStatus, isEquityAsset } from '../../utils/marketHours';

jest.mock('../../utils/marketHours');

describe('PerpsMarketHoursBanner', () => {
  const mockOnInfoPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (getMarketHoursStatus as jest.Mock).mockReturnValue({
      isOpen: true,
      nextTransition: new Date(),
      countdownText: '2 hours, 30 minutes',
    });
  });

  describe('rendering', () => {
    it('should not render for non-stock assets', () => {
      (isEquityAsset as jest.Mock).mockReturnValue(false);

      const { queryByTestId } = render(
        <PerpsMarketHoursBanner
          marketType="crypto"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(queryByTestId('perps-market-hours-banner')).toBeNull();
    });

    it('should render for stock-like assets', () => {
      (isEquityAsset as jest.Mock).mockReturnValue(true);

      const { getByTestId } = render(
        <PerpsMarketHoursBanner
          marketType="stock"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(getByTestId('perps-market-hours-banner')).toBeTruthy();
    });

    it('should use custom testID when provided', () => {
      (isEquityAsset as jest.Mock).mockReturnValue(true);

      const { getByTestId } = render(
        <PerpsMarketHoursBanner
          marketType="stock"
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
          marketType="stock"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(getByText('This asset may be traded 24/7')).toBeTruthy();
    });

    it('should display volatility warning when market is open', () => {
      const { getByText } = render(
        <PerpsMarketHoursBanner
          marketType="stock"
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
          marketType="stock"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(getByText('After-hours trading')).toBeTruthy();
    });

    it('should display slippage warning when market is closed', () => {
      const { getByText } = render(
        <PerpsMarketHoursBanner
          marketType="stock"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(
        getByText('Pay attention to volatility and slippage'),
      ).toBeTruthy();
    });
  });

  describe('learn more action', () => {
    beforeEach(() => {
      (isEquityAsset as jest.Mock).mockReturnValue(true);
    });

    it('should call onInfoPress when learn more button is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketHoursBanner
          marketType="stock"
          onInfoPress={mockOnInfoPress}
        />,
      );

      fireEvent.press(getByTestId('perps-market-hours-banner-info-button'));

      expect(mockOnInfoPress).toHaveBeenCalledTimes(1);
    });

    it('should render learn more action for both market states', () => {
      (getMarketHoursStatus as jest.Mock).mockReturnValue({
        isOpen: true,
        nextTransition: new Date(),
        countdownText: '2 hours',
      });

      const { getByTestId, rerender } = render(
        <PerpsMarketHoursBanner
          marketType="stock"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(getByTestId('perps-market-hours-banner-info-button')).toBeTruthy();

      (getMarketHoursStatus as jest.Mock).mockReturnValue({
        isOpen: false,
        nextTransition: new Date(),
        countdownText: '15 hours',
      });

      rerender(
        <PerpsMarketHoursBanner
          marketType="stock"
          onInfoPress={mockOnInfoPress}
        />,
      );

      expect(getByTestId('perps-market-hours-banner-info-button')).toBeTruthy();
    });
  });
});
