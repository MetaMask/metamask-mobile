import React from 'react';
import { render } from '@testing-library/react-native';
import MarketHoursContent from './MarketHoursContent';
import { getMarketHoursStatus } from '../../../utils/marketHours';

// Mock the market hours utilities
jest.mock('../../../utils/marketHours');

// Mock timers for testing interval updates
jest.useFakeTimers();

describe('MarketHoursContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('market hours open', () => {
    beforeEach(() => {
      (getMarketHoursStatus as jest.Mock).mockReturnValue({
        isOpen: true,
        nextTransition: new Date(),
        countdownText: '2 hours, 30 minutes',
      });
    });

    it('should display closes in countdown when market is open', () => {
      const { getByText } = render(
        <MarketHoursContent testID="market-hours-content" />,
      );

      expect(getByText(/Closes in 2 hours, 30 minutes/i)).toBeTruthy();
    });

    it('should display market hours content message', () => {
      const { getByText } = render(
        <MarketHoursContent testID="market-hours-content" />,
      );

      expect(
        getByText(
          /You're trading within regular market hours \(9:30 am to 4pm EST\)/i,
        ),
      ).toBeTruthy();
    });
  });

  describe('market hours closed', () => {
    beforeEach(() => {
      (getMarketHoursStatus as jest.Mock).mockReturnValue({
        isOpen: false,
        nextTransition: new Date(),
        countdownText: '15 hours, 30 minutes',
      });
    });

    it('should display reopens in countdown when market is closed', () => {
      const { getByText } = render(
        <MarketHoursContent testID="market-hours-content" />,
      );

      expect(getByText(/Reopens in 15 hours, 30 minutes/i)).toBeTruthy();
    });

    it('should display after hours content message', () => {
      const { getByText } = render(
        <MarketHoursContent testID="market-hours-content" />,
      );

      expect(
        getByText(
          /You're trading outside of regular market hours \(9:30 am to 4pm EST\)/i,
        ),
      ).toBeTruthy();
    });
  });

  describe('with data prop', () => {
    it('should use data.isOpen when provided', () => {
      // Mock says market is open, but data says closed
      (getMarketHoursStatus as jest.Mock).mockReturnValue({
        isOpen: true,
        nextTransition: new Date(),
        countdownText: '2 hours',
      });

      const { getByText } = render(
        <MarketHoursContent
          testID="market-hours-content"
          data={{ isOpen: false }}
        />,
      );

      // Should show after-hours message based on data prop
      expect(getByText(/Reopens in/i)).toBeTruthy();
    });

    it('should fall back to calculated status when data.isOpen is not provided', () => {
      (getMarketHoursStatus as jest.Mock).mockReturnValue({
        isOpen: true,
        nextTransition: new Date(),
        countdownText: '2 hours',
      });

      const { getByText } = render(
        <MarketHoursContent testID="market-hours-content" data={{}} />,
      );

      // Should show market hours message based on calculated status
      expect(getByText(/Closes in/i)).toBeTruthy();
    });
  });

  describe('countdown updates', () => {
    it('should update countdown every minute', () => {
      const mockGetStatus = getMarketHoursStatus as jest.Mock;

      // Initial state
      mockGetStatus.mockReturnValue({
        isOpen: true,
        nextTransition: new Date(),
        countdownText: '2 hours, 30 minutes',
      });

      const { getByText, rerender } = render(
        <MarketHoursContent testID="market-hours-content" />,
      );

      expect(getByText(/Closes in 2 hours, 30 minutes/i)).toBeTruthy();

      // Update mock for next call
      mockGetStatus.mockReturnValue({
        isOpen: true,
        nextTransition: new Date(),
        countdownText: '2 hours, 29 minutes',
      });

      // Fast-forward 1 minute
      jest.advanceTimersByTime(60000);

      // Re-render to reflect state change
      rerender(<MarketHoursContent testID="market-hours-content" />);

      // Should have updated
      expect(mockGetStatus).toHaveBeenCalledTimes(2);
    });

    it('should clear interval on unmount', () => {
      const { unmount } = render(
        <MarketHoursContent testID="market-hours-content" />,
      );

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('testID', () => {
    it('should apply testID to container', () => {
      (getMarketHoursStatus as jest.Mock).mockReturnValue({
        isOpen: true,
        nextTransition: new Date(),
        countdownText: '2 hours',
      });

      const { getByTestId } = render(
        <MarketHoursContent testID="custom-test-id" />,
      );

      expect(getByTestId('custom-test-id')).toBeTruthy();
    });
  });
});
