import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import ReferralStatsSection from './ReferralStatsSection';

// Mock the SVG component
jest.mock('../../../../../images/metamask-rewards-points.svg', () => ({
  __esModule: true,
  default: () => (
    <View testID="metamask-rewards-points-svg">
      <Text>MetaMask Rewards Points</Text>
    </View>
  ),
}));

// Mock the Skeleton component
jest.mock('../../../../../component-library/components/Skeleton', () => ({
  Skeleton: ({ height, width }: { height: number; width: number }) => (
    <View testID="skeleton" style={{ height, width }} />
  ),
}));

describe('ReferralStatsSection', () => {
  const defaultProps = {
    earnedPointsFromReferees: 6200,
    earnedPointsFromRefereesLoading: false,
    refereeCount: 5,
    refereeCountLoading: false,
  };

  describe('rendering', () => {
    it('should render correctly with all props', () => {
      const { getByText, getByTestId } = render(
        <ReferralStatsSection {...defaultProps} />,
      );

      expect(getByText('Earned from referrals')).toBeTruthy();
      expect(getByText('6,200')).toBeTruthy(); // Formatted number
      expect(getByText('Referrals')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
      expect(getByTestId('metamask-rewards-points-svg')).toBeTruthy();
    });

    it('should render with default values when no props provided', () => {
      const { getByText } = render(<ReferralStatsSection />);

      expect(getByText('Earned from referrals')).toBeTruthy();
      expect(getByText('6,200')).toBeTruthy(); // Default value
      expect(getByText('Referrals')).toBeTruthy();
      expect(getByText('0')).toBeTruthy(); // Default value
    });

    it('should render with zero values', () => {
      const { getByText } = render(
        <ReferralStatsSection earnedPointsFromReferees={0} refereeCount={0} />,
      );

      expect(getByText('0')).toBeTruthy(); // Points
      expect(getByText('0')).toBeTruthy(); // Referees (should appear twice)
    });
  });

  describe('loading states', () => {
    it('should show skeleton for earned points when loading', () => {
      const { getByTestId, queryByText } = render(
        <ReferralStatsSection
          {...defaultProps}
          earnedPointsFromRefereesLoading
        />,
      );

      expect(getByTestId('skeleton')).toBeTruthy();
      expect(queryByText('6,200')).toBeNull();
    });

    it('should show skeleton for referee count when loading', () => {
      const { getAllByTestId, queryByText } = render(
        <ReferralStatsSection {...defaultProps} refereeCountLoading />,
      );

      const skeletons = getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
      expect(queryByText('5')).toBeNull();
    });

    it('should show both skeletons when both are loading', () => {
      const { getAllByTestId } = render(
        <ReferralStatsSection
          {...defaultProps}
          earnedPointsFromRefereesLoading
          refereeCountLoading
        />,
      );

      const skeletons = getAllByTestId('skeleton');
      expect(skeletons.length).toBe(2);
    });

    it('should show actual values when not loading', () => {
      const { getByText, queryByTestId } = render(
        <ReferralStatsSection
          {...defaultProps}
          earnedPointsFromRefereesLoading={false}
          refereeCountLoading={false}
        />,
      );

      expect(getByText('6,200')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
      expect(queryByTestId('skeleton')).toBeNull();
    });
  });

  describe('number formatting', () => {
    it('should format large numbers with commas', () => {
      const { getByText } = render(
        <ReferralStatsSection
          earnedPointsFromReferees={1234567}
          refereeCount={1000}
        />,
      );

      expect(getByText('1,234,567')).toBeTruthy();
      expect(getByText('1,000')).toBeTruthy();
    });

    it('should handle small numbers without commas', () => {
      const { getByText } = render(
        <ReferralStatsSection
          earnedPointsFromReferees={123}
          refereeCount={5}
        />,
      );

      expect(getByText('123')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
    });

    it('should handle decimal numbers by rounding', () => {
      const { getByText } = render(
        <ReferralStatsSection
          earnedPointsFromReferees={1234.56}
          refereeCount={10}
        />,
      );

      expect(getByText('1,235')).toBeTruthy(); // Rounded up
    });
  });

  describe('edge cases', () => {
    it('should handle undefined values gracefully', () => {
      const { getByText } = render(
        <ReferralStatsSection
          earnedPointsFromReferees={undefined}
          refereeCount={undefined}
        />,
      );

      expect(getByText('6,200')).toBeTruthy(); // Default value
      expect(getByText('0')).toBeTruthy(); // Default value
    });

    it('should handle negative numbers', () => {
      const { getByText } = render(
        <ReferralStatsSection
          earnedPointsFromReferees={-100}
          refereeCount={-5}
        />,
      );

      expect(getByText('-100')).toBeTruthy();
      expect(getByText('-5')).toBeTruthy();
    });

    it('should handle very large numbers', () => {
      const { getByText } = render(
        <ReferralStatsSection
          earnedPointsFromReferees={999999999}
          refereeCount={999999}
        />,
      );

      expect(getByText('999,999,999')).toBeTruthy();
      expect(getByText('999,999')).toBeTruthy();
    });
  });

  describe('component structure', () => {
    it('should render without crashing', () => {
      expect(() => render(<ReferralStatsSection />)).not.toThrow();
    });

    it('should display both sections side by side', () => {
      const { getByText } = render(<ReferralStatsSection {...defaultProps} />);

      // Both sections should be present
      expect(getByText('Earned from referrals')).toBeTruthy();
      expect(getByText('Referrals')).toBeTruthy();
    });

    it('should include the rewards points image', () => {
      const { getByTestId } = render(
        <ReferralStatsSection {...defaultProps} />,
      );

      expect(getByTestId('metamask-rewards-points-svg')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should render text elements that are accessible', () => {
      const { getByText } = render(<ReferralStatsSection {...defaultProps} />);

      const earnedLabel = getByText('Earned from referrals');
      const referralsLabel = getByText('Referrals');
      const earnedValue = getByText('6,200');
      const referralsValue = getByText('5');

      expect(earnedLabel).toBeTruthy();
      expect(referralsLabel).toBeTruthy();
      expect(earnedValue).toBeTruthy();
      expect(referralsValue).toBeTruthy();
    });
  });
});
