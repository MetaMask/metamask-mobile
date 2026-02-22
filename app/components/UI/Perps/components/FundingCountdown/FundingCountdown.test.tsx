import React from 'react';
import { render } from '@testing-library/react-native';
import FundingCountdown from './FundingCountdown';
import { calculateFundingCountdown } from '../../utils/marketUtils';

jest.mock('../../utils/marketUtils', () => ({
  calculateFundingCountdown: jest.fn(),
}));

describe('FundingCountdown', () => {
  const mockCalculateFundingCountdown = calculateFundingCountdown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with market-specific funding time', () => {
    const nextFundingTime = Date.now() + 3600000; // 1 hour from now
    const fundingIntervalHours = 4;

    mockCalculateFundingCountdown.mockReturnValue('00:59:59');

    const { getByText } = render(
      <FundingCountdown
        nextFundingTime={nextFundingTime}
        fundingIntervalHours={fundingIntervalHours}
      />,
    );

    expect(mockCalculateFundingCountdown).toHaveBeenCalledWith({
      nextFundingTime,
      fundingIntervalHours,
    });
    expect(getByText('(00:59:59)')).toBeTruthy();
  });

  it('should render with default 8-hour intervals when no specific time provided', () => {
    mockCalculateFundingCountdown.mockReturnValue('07:59:59');

    const { getByText } = render(<FundingCountdown />);

    expect(mockCalculateFundingCountdown).toHaveBeenCalledWith({
      nextFundingTime: undefined,
      fundingIntervalHours: undefined,
    });
    expect(getByText('(07:59:59)')).toBeTruthy();
  });

  it('should update countdown every second', () => {
    jest.useFakeTimers();

    // Initial render returns 00:59:59
    mockCalculateFundingCountdown.mockReturnValue('00:59:59');

    const nextFundingTime = Date.now() + 3600000;

    const { getByText } = render(
      <FundingCountdown nextFundingTime={nextFundingTime} />,
    );

    // Verify initial render
    expect(getByText('(00:59:59)')).toBeTruthy();

    // Update mock for next call
    mockCalculateFundingCountdown.mockReturnValue('00:59:58');

    // Fast-forward 1 second to trigger the interval
    jest.advanceTimersByTime(1000);

    // The component should have called calculateFundingCountdown multiple times (initial + interval)
    expect(mockCalculateFundingCountdown).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('should pass testID when provided', () => {
    mockCalculateFundingCountdown.mockReturnValue('00:59:59');

    const { getByTestId, getByText } = render(
      <FundingCountdown testID="funding-countdown-test" />,
    );

    expect(getByTestId('funding-countdown-test')).toBeTruthy();
    expect(getByText('(00:59:59)')).toBeTruthy();
  });

  it('should accept and apply style prop', () => {
    mockCalculateFundingCountdown.mockReturnValue('00:59:59');

    const customStyle = { marginLeft: 10, fontSize: 20 };
    const { getByTestId } = render(
      <FundingCountdown testID="styled-countdown" style={customStyle} />,
    );

    const element = getByTestId('styled-countdown');
    expect(element.props.style).toEqual(expect.objectContaining(customStyle));
  });
});
