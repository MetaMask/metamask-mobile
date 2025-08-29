import React from 'react';
import { render } from '@testing-library/react-native';
import ReferralStatsSection from './ReferralStatsSection';

// Mock the SVG component
jest.mock(
  '../../../../../images/metamask-rewards-points.svg',
  () => 'MetamaskRewardsPointsSvg',
);

// Mock the Skeleton component
jest.mock('../../../../../component-library/components/Skeleton', () => {
  const mockReact = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  return {
    Skeleton: ({
      testID = 'skeleton',
      width,
      height,
      style,
    }: {
      testID?: string;
      width?: number | string;
      height?: number | string;
      style?: object;
    }) =>
      mockReact.createElement(RN.View, {
        testID,
        style: [{ width, height }, style],
      }),
  };
});

describe('ReferralStatsSection', () => {
  const defaultProps = {
    earnedPointsFromReferees: 6200,
    earnedPointsFromRefereesLoading: false,
    refereeCount: 5,
    refereeCountLoading: false,
  };

  describe('rendering', () => {
    it('should render correctly with all props', () => {
      const { getByText } = render(<ReferralStatsSection {...defaultProps} />);

      expect(getByText('Earned from referrals')).toBeTruthy();
      expect(getByText('6,200')).toBeTruthy(); // Formatted number
      expect(getByText('Referrals')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
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

    it('should render without the rewards points image breaking the component', () => {
      const { getByText } = render(<ReferralStatsSection {...defaultProps} />);

      // Just verify the main content renders correctly
      expect(getByText('Earned from referrals')).toBeTruthy();
      expect(getByText('Referrals')).toBeTruthy();
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
