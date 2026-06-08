import React from 'react';
import { render } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import CampaignLeaderboardStatsHeader from './CampaignLeaderboardStatsHeader';

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

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

const TEST_IDS = {
  CONTAINER: 'campaign-lb-stats-header-container',
  RANK_VALUE: 'campaign-lb-stats-header-rank',
  SUBTEXT_VALUE: 'campaign-lb-stats-header-subtext',
  COMPUTED_AT: 'campaign-lb-stats-header-computed-at',
  PENDING_TAG: 'campaign-lb-stats-header-pending-tag',
  QUALIFIED_ICON: 'campaign-lb-stats-header-qualified-icon',
};

const defaultProps = {
  title: 'Your rank',
  rank: 5,
  isEligible: true,
  testIDs: TEST_IDS,
};

describe('CampaignLeaderboardStatsHeader', () => {
  it('renders container with padded rank and title', () => {
    const { getByTestId, getByText } = render(
      <CampaignLeaderboardStatsHeader {...defaultProps} />,
    );
    expect(getByTestId(TEST_IDS.CONTAINER)).toBeDefined();
    expect(getByTestId(TEST_IDS.RANK_VALUE).props.children).toBe('05');
    expect(getByText('Your rank')).toBeDefined();
  });

  it('shows qualified icon when eligible', () => {
    const { getByTestId, queryByTestId } = render(
      <CampaignLeaderboardStatsHeader {...defaultProps} isEligible />,
    );
    expect(getByTestId(TEST_IDS.QUALIFIED_ICON)).toBeDefined();
    expect(queryByTestId(TEST_IDS.PENDING_TAG)).toBeNull();
  });

  it('shows pending tag when not eligible and campaign is active', () => {
    const { getByTestId, queryByTestId } = render(
      <CampaignLeaderboardStatsHeader {...defaultProps} isEligible={false} />,
    );
    expect(getByTestId(TEST_IDS.PENDING_TAG)).toBeDefined();
    expect(queryByTestId(TEST_IDS.QUALIFIED_ICON)).toBeNull();
  });

  it('hides pending tag when not eligible but campaign is complete', () => {
    const { queryByTestId } = render(
      <CampaignLeaderboardStatsHeader
        {...defaultProps}
        isEligible={false}
        isCampaignComplete
      />,
    );
    expect(queryByTestId(TEST_IDS.PENDING_TAG)).toBeNull();
  });

  it('shows subtext and computed-at when provided', () => {
    const { getByTestId } = render(
      <CampaignLeaderboardStatsHeader
        {...defaultProps}
        subtextValue="+12.50%"
        subtextColor={TextColor.SuccessDefault}
        computedAtLabel="Updated 3:00 PM"
      />,
    );
    expect(getByTestId(TEST_IDS.SUBTEXT_VALUE).props.children).toBe('+12.50%');
    expect(getByTestId(TEST_IDS.COMPUTED_AT).props.children).toBe(
      'Updated 3:00 PM',
    );
  });

  it('uses empty rank placeholder when rank is null', () => {
    const { getByTestId } = render(
      <CampaignLeaderboardStatsHeader
        {...defaultProps}
        rank={null}
        emptyRankValue="-"
      />,
    );
    expect(getByTestId(TEST_IDS.RANK_VALUE).props.children).toBe('-');
  });

  it('hides rank and subtext when loading', () => {
    const { queryByTestId, getByTestId } = render(
      <CampaignLeaderboardStatsHeader {...defaultProps} isLoading />,
    );
    expect(getByTestId(TEST_IDS.CONTAINER)).toBeDefined();
    expect(queryByTestId(TEST_IDS.RANK_VALUE)).toBeNull();
    expect(queryByTestId(TEST_IDS.SUBTEXT_VALUE)).toBeNull();
  });

  it('hides subtext row when showSubtext and showComputedAt are false', () => {
    const { queryByTestId } = render(
      <CampaignLeaderboardStatsHeader
        {...defaultProps}
        showSubtext={false}
        showComputedAt={false}
      />,
    );
    expect(queryByTestId(TEST_IDS.SUBTEXT_VALUE)).toBeNull();
    expect(queryByTestId(TEST_IDS.COMPUTED_AT)).toBeNull();
  });
});
