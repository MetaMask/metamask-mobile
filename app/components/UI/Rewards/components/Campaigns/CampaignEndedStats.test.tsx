import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TextColor } from '@metamask/design-system-react-native';
import CampaignEndedStats, {
  CAMPAIGN_ENDED_STATS_TEST_IDS,
} from './CampaignEndedStats';

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { title: string; onConfirm?: () => void }) =>
      ReactActual.createElement(
        RN.View,
        { testID: 'rewards-error-banner' },
        ReactActual.createElement(RN.Text, null, props.title),
        ReactActual.createElement(RN.TouchableOpacity, {
          testID: 'rewards-error-banner-retry',
          onPress: props.onConfirm,
        }),
      ),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ...actual,
    Text: (props: Record<string, unknown>) =>
      ReactActual.createElement(RN.Text, props, props.children),
    Skeleton: (props: Record<string, unknown>) =>
      ReactActual.createElement(RN.View, { testID: 'skeleton', ...props }),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const baseProps = {
  totalParticipants: {
    label: 'Total participants',
    value: '14,312',
  },
  totalVolume: {
    label: 'Total TVL',
    value: '$6.8M',
  },
  topMetric: {
    label: 'Top return',
    value: '+84.70%',
    valueColor: TextColor.SuccessDefault,
  },
  totalWinners: {
    label: 'Total winners',
    value: '8',
  },
};

describe('CampaignEndedStats', () => {
  it('renders all four stat cells with caller-provided labels and values', () => {
    const { getByTestId, getByText } = render(
      <CampaignEndedStats {...baseProps} />,
    );

    expect(getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.CONTAINER)).toBeTruthy();
    expect(getByText('Total participants')).toBeOnTheScreen();
    expect(getByText('Total TVL')).toBeOnTheScreen();
    expect(getByText('Top return')).toBeOnTheScreen();
    expect(getByText('Total winners')).toBeOnTheScreen();
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_PARTICIPANTS).props
        .children,
    ).toBe('14,312');
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOTAL_TVL).props.children,
    ).toBe('$6.8M');
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOP_RETURN).props.children,
    ).toBe('+84.70%');
    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.WINNERS).props.children,
    ).toBe('8');
  });

  it('passes the top metric color through to the stat cell', () => {
    const { getByTestId } = render(<CampaignEndedStats {...baseProps} />);

    expect(
      getByTestId(CAMPAIGN_ENDED_STATS_TEST_IDS.TOP_RETURN).props.color,
    ).toBe(TextColor.SuccessDefault);
  });

  it('renders skeletons for loading stat cells', () => {
    const { getAllByTestId } = render(
      <CampaignEndedStats
        {...baseProps}
        totalParticipants={{
          ...baseProps.totalParticipants,
          isLoading: true,
        }}
        totalVolume={{
          ...baseProps.totalVolume,
          isLoading: true,
        }}
        topMetric={{
          ...baseProps.topMetric,
          isLoading: true,
        }}
        totalWinners={{
          ...baseProps.totalWinners,
          isLoading: true,
        }}
      />,
    );

    expect(getAllByTestId('skeleton')).toHaveLength(4);
  });

  it('shows a generic error banner and calls onRetry', () => {
    const onRetry = jest.fn();
    const { getByTestId, getByText } = render(
      <CampaignEndedStats {...baseProps} hasError onRetry={onRetry} />,
    );

    expect(
      getByText('rewards.campaign_ended_stats.error_title'),
    ).toBeOnTheScreen();
    fireEvent.press(getByTestId('rewards-error-banner-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show the error banner when hasError is false', () => {
    const { queryByTestId } = render(
      <CampaignEndedStats {...baseProps} hasError={false} />,
    );

    expect(queryByTestId('rewards-error-banner')).toBeNull();
  });
});
