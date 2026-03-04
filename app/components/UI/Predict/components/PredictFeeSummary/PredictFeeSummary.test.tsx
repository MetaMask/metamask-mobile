import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import PredictFeeSummary from './PredictFeeSummary';
import { usePredictRewards } from '../../hooks/usePredictRewards';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: () => ({}),
  }),
}));

jest.mock('../../hooks/usePredictRewards', () => ({
  usePredictRewards: jest.fn(),
}));

jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn(
    (value: number, options?: { maximumDecimals?: number }) =>
      `$${value.toFixed(options?.maximumDecimals ?? 2)}`,
  ),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'predict.fee_summary.total': 'Total',
      'predict.fee_summary.total_incl_fees': 'incl. fees',
      'predict.fee_summary.estimated_points': 'Estimated points',
      'predict.fee_summary.points_tooltip': 'Points tooltip',
      'predict.fee_summary.points_tooltip_content_1': 'content 1',
      'predict.fee_summary.points_tooltip_content_2': 'content 2',
      'predict.fee_summary.points_error': 'Points error',
      'predict.fee_summary.points_error_content': 'Points error content',
    };
    return translations[key] ?? key;
  }),
}));

jest.mock(
  '../../../../../component-library/components-temp/KeyValueRow',
  () => {
    const ReactActual = jest.requireActual('react');
    const { Text, View } = jest.requireActual('react-native');
    return ({
      field,
      value,
    }: {
      field: { label: { text: string } };
      value: { label: React.ReactNode; tooltip?: { title: string } };
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'key-value-row' },
        ReactActual.createElement(Text, null, field.label.text),
        value.tooltip
          ? ReactActual.createElement(Text, null, value.tooltip.title)
          : null,
        ReactActual.createElement(
          View,
          { testID: 'key-value-value' },
          value.label,
        ),
      );
  },
);

jest.mock(
  '../../../Rewards/components/AddRewardsAccount/AddRewardsAccount',
  () => {
    const ReactActual = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return ({ account }: { account: { id: string } }) =>
      ReactActual.createElement(Text, null, `AddRewardsAccount:${account.id}`);
  },
);

jest.mock('../../../Rewards/components/RewardPointsAnimation', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const RewardAnimationState = {
    Loading: 'loading',
    ErrorState: 'error',
    Idle: 'idle',
  };
  return {
    __esModule: true,
    RewardAnimationState,
    default: ({ value, state }: { value: number; state: string }) =>
      ReactActual.createElement(
        Text,
        null,
        `RewardsAnimation:${value}:${state}`,
      ),
  };
});

const mockUsePredictRewards = usePredictRewards as jest.MockedFunction<
  typeof usePredictRewards
>;

const baseProps = {
  disabled: false,
  loading: false,
  total: 13.5,
  rewardsFeeAmountUsd: 1.5,
  handleFeesInfoPress: jest.fn(),
};

const setRewardsState = (
  overrides: Partial<ReturnType<typeof usePredictRewards>> = {},
) => {
  mockUsePredictRewards.mockReturnValue({
    enabled: false,
    isLoading: false,
    accountOptedIn: null,
    rewardsAccountScope: null,
    shouldShowRewardsRow: false,
    estimatedPoints: null,
    hasError: false,
    ...overrides,
  });
};

const mockRewardsAccountScope = {
  id: 'account-123',
} as unknown as NonNullable<
  ReturnType<typeof usePredictRewards>['rewardsAccountScope']
>;

describe('PredictFeeSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setRewardsState();
  });

  it('renders nothing when disabled is true', () => {
    render(<PredictFeeSummary {...baseProps} disabled />);

    expect(screen.queryByText('Total')).not.toBeOnTheScreen();
    expect(mockUsePredictRewards).toHaveBeenCalledWith(1.5);
  });

  it('renders skeleton layout when loading is true', () => {
    setRewardsState({
      shouldShowRewardsRow: true,
      accountOptedIn: true,
    });

    render(<PredictFeeSummary {...baseProps} loading />);

    expect(screen.queryByText('Total')).not.toBeOnTheScreen();
    expect(screen.queryByText('Estimated points')).not.toBeOnTheScreen();
  });

  it('renders total and triggers fee info press callback', () => {
    const handleFeesInfoPress = jest.fn();
    const { UNSAFE_getByType } = render(
      <PredictFeeSummary
        {...baseProps}
        handleFeesInfoPress={handleFeesInfoPress}
      />,
    );

    expect(screen.getByText('Total')).toBeOnTheScreen();
    expect(screen.getByText('incl. fees')).toBeOnTheScreen();
    expect(screen.getByText('$13.50')).toBeOnTheScreen();

    fireEvent.press(UNSAFE_getByType(TouchableOpacity));
    expect(handleFeesInfoPress).toHaveBeenCalledTimes(1);
  });

  it('renders rewards animation in idle state for opted-in accounts', () => {
    setRewardsState({
      shouldShowRewardsRow: true,
      accountOptedIn: true,
      estimatedPoints: 25,
      isLoading: false,
      hasError: false,
    });

    render(<PredictFeeSummary {...baseProps} />);

    expect(screen.getByText('Estimated points')).toBeOnTheScreen();
    expect(screen.getByText('RewardsAnimation:25:idle')).toBeOnTheScreen();
  });

  it('renders rewards animation in loading state when rewards are loading', () => {
    setRewardsState({
      shouldShowRewardsRow: true,
      accountOptedIn: true,
      estimatedPoints: 25,
      isLoading: true,
    });

    render(<PredictFeeSummary {...baseProps} />);

    expect(screen.getByText('RewardsAnimation:25:loading')).toBeOnTheScreen();
  });

  it('renders rewards animation in loading state when override is true', () => {
    setRewardsState({
      shouldShowRewardsRow: true,
      accountOptedIn: true,
      estimatedPoints: 25,
      isLoading: false,
    });

    render(<PredictFeeSummary {...baseProps} rewardsLoadingOverride />);

    expect(screen.getByText('RewardsAnimation:25:loading')).toBeOnTheScreen();
  });

  it('renders rewards error state and tooltip when hook has an error', () => {
    setRewardsState({
      shouldShowRewardsRow: true,
      accountOptedIn: true,
      estimatedPoints: 0,
      hasError: true,
    });

    render(<PredictFeeSummary {...baseProps} />);

    expect(screen.getByText('RewardsAnimation:0:error')).toBeOnTheScreen();
    expect(screen.getByText('Points error')).toBeOnTheScreen();
  });

  it('renders AddRewardsAccount when account is not opted in but scope is available', () => {
    setRewardsState({
      shouldShowRewardsRow: true,
      accountOptedIn: false,
      rewardsAccountScope: mockRewardsAccountScope,
    });

    render(<PredictFeeSummary {...baseProps} />);

    expect(screen.getByText('Estimated points')).toBeOnTheScreen();
    expect(screen.getByText('AddRewardsAccount:account-123')).toBeOnTheScreen();
  });

  it('hides rewards row when rewards are unsupported or disabled', () => {
    setRewardsState({
      shouldShowRewardsRow: false,
      accountOptedIn: false,
      rewardsAccountScope: null,
    });

    render(<PredictFeeSummary {...baseProps} />);

    expect(screen.queryByText('Estimated points')).not.toBeOnTheScreen();
  });
});
