import React from 'react';
import { render } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import LeaderboardPositionHeader, {
  LEADERBOARD_POSITION_HEADER_TEST_IDS,
} from './LeaderboardPositionHeader';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ...actual,
    Text: (props: Record<string, unknown>) =>
      ReactActual.createElement(RN.Text, props, props.children),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const TEST_IDS = LEADERBOARD_POSITION_HEADER_TEST_IDS;

const defaultProps = {
  rank: '05',
  tier: 'Gold',
};

describe('LeaderboardPositionHeader', () => {
  describe('rendering', () => {
    it('renders container with rank and tier', () => {
      const { getByTestId, getByText } = render(
        <LeaderboardPositionHeader {...defaultProps} />,
      );
      expect(getByTestId(TEST_IDS.CONTAINER)).toBeDefined();
      expect(getByTestId(TEST_IDS.RANK_VALUE)).toBeDefined();
      expect(getByText('05')).toBeDefined();
      expect(getByText('Gold')).toBeDefined();
    });

    it('renders "Your rank" heading', () => {
      const { getByText } = render(
        <LeaderboardPositionHeader {...defaultProps} />,
      );
      expect(
        getByText('rewards.ondo_campaign_stats.label_your_rank'),
      ).toBeDefined();
    });

    it('renders tier label', () => {
      const { getByText } = render(
        <LeaderboardPositionHeader {...defaultProps} />,
      );
      expect(getByText('rewards.ondo_campaign_stats.label_tier')).toBeDefined();
    });
  });

  describe('loading state', () => {
    it('hides rank value when loading', () => {
      const { queryByTestId } = render(
        <LeaderboardPositionHeader {...defaultProps} isLoading />,
      );
      expect(queryByTestId(TEST_IDS.RANK_VALUE)).toBeNull();
    });

    it('hides return value when loading even if showReturn is true', () => {
      const { queryByTestId } = render(
        <LeaderboardPositionHeader
          {...defaultProps}
          isLoading
          showReturn
          returnValue="+10.00%"
        />,
      );
      expect(queryByTestId(TEST_IDS.RETURN_VALUE)).toBeNull();
    });
  });

  describe('status tags', () => {
    it('shows Pending tag when isPending is true', () => {
      const { getByTestId } = render(
        <LeaderboardPositionHeader {...defaultProps} isPending />,
      );
      expect(getByTestId(TEST_IDS.PENDING_TAG)).toBeDefined();
    });

    it('shows qualified icon when isQualified is true', () => {
      const { getByTestId } = render(
        <LeaderboardPositionHeader {...defaultProps} isQualified />,
      );
      expect(getByTestId(TEST_IDS.QUALIFIED_ICON)).toBeDefined();
    });

    it('shows Ineligible tag when isIneligible is true', () => {
      const { getByTestId } = render(
        <LeaderboardPositionHeader {...defaultProps} isIneligible />,
      );
      expect(getByTestId(TEST_IDS.INELIGIBLE_TAG)).toBeDefined();
    });

    it('does not show Pending or qualified when isIneligible is true', () => {
      const { queryByTestId } = render(
        <LeaderboardPositionHeader
          {...defaultProps}
          isIneligible
          isPending
          isQualified
        />,
      );
      expect(queryByTestId(TEST_IDS.PENDING_TAG)).toBeNull();
      expect(queryByTestId(TEST_IDS.QUALIFIED_ICON)).toBeNull();
      expect(queryByTestId(TEST_IDS.INELIGIBLE_TAG)).toBeDefined();
    });

    it('does not show any tags by default', () => {
      const { queryByTestId } = render(
        <LeaderboardPositionHeader {...defaultProps} />,
      );
      expect(queryByTestId(TEST_IDS.PENDING_TAG)).toBeNull();
      expect(queryByTestId(TEST_IDS.QUALIFIED_ICON)).toBeNull();
      expect(queryByTestId(TEST_IDS.INELIGIBLE_TAG)).toBeNull();
    });
  });

  describe('showReturn', () => {
    it('shows return value when showReturn is true and returnValue is provided', () => {
      const { getByTestId, getByText } = render(
        <LeaderboardPositionHeader
          {...defaultProps}
          showReturn
          returnValue="+15.00%"
          returnColor={TextColor.SuccessDefault}
        />,
      );
      expect(getByTestId(TEST_IDS.RETURN_VALUE)).toBeDefined();
      expect(getByText('+15.00%')).toBeDefined();
    });

    it('does not show return when showReturn is false', () => {
      const { queryByTestId } = render(
        <LeaderboardPositionHeader {...defaultProps} returnValue="+15.00%" />,
      );
      expect(queryByTestId(TEST_IDS.RETURN_VALUE)).toBeNull();
    });

    it('does not show return when returnValue is undefined', () => {
      const { queryByTestId } = render(
        <LeaderboardPositionHeader {...defaultProps} showReturn />,
      );
      expect(queryByTestId(TEST_IDS.RETURN_VALUE)).toBeNull();
    });
  });

  describe('showPrizePool', () => {
    it('shows prize pool StatCell when showPrizePool is true', () => {
      const { getByTestId, getByText } = render(
        <LeaderboardPositionHeader
          {...defaultProps}
          showPrizePool
          prizePoolValue="$25,000"
        />,
      );
      expect(getByTestId(TEST_IDS.PRIZE_POOL_VALUE)).toBeDefined();
      expect(getByText('$25,000')).toBeDefined();
      expect(getByText('rewards.ondo_campaign_prize_pool.title')).toBeDefined();
    });

    it('shows dash when showPrizePool is true but prizePoolValue is undefined', () => {
      const { getByText } = render(
        <LeaderboardPositionHeader {...defaultProps} showPrizePool />,
      );
      expect(getByText('-')).toBeDefined();
    });

    it('does not show prize pool when showPrizePool is false', () => {
      const { queryByTestId } = render(
        <LeaderboardPositionHeader
          {...defaultProps}
          prizePoolValue="$25,000"
        />,
      );
      expect(queryByTestId(TEST_IDS.PRIZE_POOL_VALUE)).toBeNull();
    });
  });

  describe('combined props', () => {
    it('shows return and prize pool together', () => {
      const { getByTestId, getByText } = render(
        <LeaderboardPositionHeader
          {...defaultProps}
          isPending
          showReturn
          returnValue="-3.00%"
          returnColor={TextColor.ErrorDefault}
          showPrizePool
          prizePoolValue="$50,000"
        />,
      );
      expect(getByTestId(TEST_IDS.PENDING_TAG)).toBeDefined();
      expect(getByTestId(TEST_IDS.RETURN_VALUE)).toBeDefined();
      expect(getByText('-3.00%')).toBeDefined();
      expect(getByTestId(TEST_IDS.PRIZE_POOL_VALUE)).toBeDefined();
      expect(getByText('$50,000')).toBeDefined();
    });
  });
});
