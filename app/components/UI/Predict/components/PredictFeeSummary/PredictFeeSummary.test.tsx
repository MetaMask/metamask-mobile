import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictFeeSummary from './PredictFeeSummary';
import { InternalAccount } from '@metamask/keyring-internal-api';

jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn((value, options) =>
    value !== undefined
      ? `$${value.toFixed(options?.maximumDecimals ?? 2)}`
      : '$0.00',
  ),
}));

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'predict.fee_summary.fees': 'Fees',
      'predict.fee_summary.total': 'Total',
      'predict.fee_summary.estimated_points': 'Est. points',
      'predict.fee_summary.points_tooltip': 'Points',
      'predict.fee_summary.points_tooltip_content_1':
        'Points are how you earn MetaMask Rewards for completing transactions, like when you swap, bridge, or predict.',
      'predict.fee_summary.points_tooltip_content_2':
        'Keep in mind this value is an estimate and will be finalized once the transaction is complete. Points can take up to 1 hour to be confirmed in your Rewards balance.',
      'predict.fee_summary.points_error': "We can't load points right now",
      'predict.fee_summary.points_error_content':
        "You'll still earn any points for this transaction. We'll notify you once they've been added to your account. You can also check your rewards tab in about an hour.",
    };
    return mockStrings[key] || key;
  }),
}));

// Mock ButtonIcon
jest.mock(
  '../../../../../component-library/components/Buttons/ButtonIcon',
  () => {
    const React = jest.requireActual('react');
    const { TouchableOpacity } = jest.requireActual('react-native');
    return React.forwardRef(
      (
        { onPress, testID }: { onPress?: () => void; testID?: string },
        ref: React.Ref<unknown>,
      ) =>
        React.createElement(TouchableOpacity, {
          onPress,
          testID: testID || 'button-icon',
          ref,
        }),
    );
  },
);

// Mock TooltipSizes
jest.mock(
  '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow.types',
  () => ({
    TooltipSizes: {
      Sm: 'small',
      Md: 'medium',
      Lg: 'large',
    },
  }),
);

// Mock KeyValueRow
jest.mock(
  '../../../../../component-library/components-temp/KeyValueRow',
  () => {
    const React = jest.requireActual('react');
    const { View, Text: RNText } = jest.requireActual('react-native');
    return ({
      field,
      value,
    }: {
      field: { label: { text: string }; tooltip?: unknown };
      value: { label: React.ReactNode; tooltip?: unknown };
    }) =>
      React.createElement(
        View,
        { testID: 'key-value-row' },
        React.createElement(RNText, null, field.label.text),
        value.label,
        value.tooltip &&
          React.createElement(View, { testID: 'value-tooltip' }, 'Tooltip'),
      );
  },
);

// Mock RewardsAnimations
jest.mock('../../../Rewards/components/RewardPointsAnimation', () => {
  const React = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ value, state }: { value: number; state: string }) =>
      React.createElement(
        RNText,
        { testID: 'rewards-animation', 'data-state': state },
        `${value} points`,
      ),
    RewardAnimationState: {
      Loading: 'Loading',
      ErrorState: 'ErrorState',
      Idle: 'Idle',
    },
  };
});

// Mock AddRewardsAccount
jest.mock(
  '../../../Rewards/components/AddRewardsAccount/AddRewardsAccount',
  () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () =>
        React.createElement(
          View,
          { testID: 'add-rewards-account' },
          'Add Rewards Account',
        ),
    };
  },
);

describe('PredictFeeSummary', () => {
  const defaultProps = {
    disabled: false,
    providerFee: 0.1,
    metamaskFee: 0.04,
    total: 1.14,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders fee summary when not disabled', () => {
      const props = { ...defaultProps, disabled: false };

      const { getByText } = render(<PredictFeeSummary {...props} />);

      expect(getByText('Fees')).toBeOnTheScreen();
      expect(getByText('Total')).toBeOnTheScreen();
    });

    it('does not render fee summary when disabled', () => {
      const props = { ...defaultProps, disabled: true };

      const { queryByText } = render(<PredictFeeSummary {...props} />);

      expect(queryByText('Fees')).toBeNull();
      expect(queryByText('Total')).toBeNull();
    });
  });

  describe('Consolidated Fees Display', () => {
    it('displays total fees as sum of provider and MetaMask fees', () => {
      const props = { ...defaultProps, providerFee: 0.1, metamaskFee: 0.04 };

      const { getByText } = render(<PredictFeeSummary {...props} />);

      expect(getByText('$0.14')).toBeOnTheScreen();
    });

    it('displays total amount correctly', () => {
      const props = { ...defaultProps, total: 2.12 };

      const { getByText } = render(<PredictFeeSummary {...props} />);

      expect(getByText('$2.12')).toBeOnTheScreen();
    });

    it('displays zero fees when both provider and MetaMask fees are zero', () => {
      const props = {
        ...defaultProps,
        providerFee: 0,
        metamaskFee: 0,
        total: 1.0,
      };

      const { getByText } = render(<PredictFeeSummary {...props} />);

      expect(getByText('$0.00')).toBeOnTheScreen();
    });
  });

  describe('Fees Info Icon', () => {
    it('calls onFeesInfoPress when info icon is pressed', () => {
      const mockOnFeesInfoPress = jest.fn();
      const props = { ...defaultProps, onFeesInfoPress: mockOnFeesInfoPress };

      const { getByTestId } = render(<PredictFeeSummary {...props} />);

      fireEvent.press(getByTestId('button-icon'));

      expect(mockOnFeesInfoPress).toHaveBeenCalledTimes(1);
    });

    it('does not crash when onFeesInfoPress is not provided', () => {
      const props = { ...defaultProps };

      const { getByTestId } = render(<PredictFeeSummary {...props} />);

      expect(() => fireEvent.press(getByTestId('button-icon'))).not.toThrow();
    });
  });

  describe('Rewards Row', () => {
    it('does not display rewards row when shouldShowRewardsRow is false', () => {
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: false,
        estimatedPoints: 100,
      };

      const { queryByText, queryByTestId } = render(
        <PredictFeeSummary {...props} />,
      );

      expect(queryByText('Est. points')).toBeNull();
      expect(queryByTestId('rewards-animation')).toBeNull();
      expect(queryByTestId('add-rewards-account')).toBeNull();
    });

    it('displays rewards row when shouldShowRewardsRow is true', () => {
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: true,
        estimatedPoints: 50,
      };

      const { getByText, getByTestId } = render(
        <PredictFeeSummary {...props} />,
      );

      expect(getByText('Est. points')).toBeOnTheScreen();
      expect(getByTestId('rewards-animation')).toBeOnTheScreen();
    });

    it('displays correct estimated points value when account is opted in', () => {
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: true,
        estimatedPoints: 123,
      };

      const { getByText } = render(<PredictFeeSummary {...props} />);

      expect(getByText('123 points')).toBeOnTheScreen();
    });

    it('displays zero points when estimatedPoints is 0 and account is opted in', () => {
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: true,
        estimatedPoints: 0,
      };

      const { getByText } = render(<PredictFeeSummary {...props} />);

      expect(getByText('0 points')).toBeOnTheScreen();
    });

    it('displays AddRewardsAccount when rewardsAccountScope is provided and accountOptedIn is false', () => {
      const mockRewardsAccountScope = {
        id: 'account-1',
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Account',
        type: 'eip155:eoa',
        scopes: [],
        metadata: {},
      };
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: false,
        rewardsAccountScope:
          mockRewardsAccountScope as unknown as InternalAccount,
        estimatedPoints: 100,
      };

      const { getByTestId, queryByTestId } = render(
        <PredictFeeSummary {...props} />,
      );

      expect(getByTestId('add-rewards-account')).toBeOnTheScreen();
      expect(queryByTestId('rewards-animation')).toBeNull();
    });

    it('displays AddRewardsAccount when rewardsAccountScope is provided and accountOptedIn is null', () => {
      const mockRewardsAccountScope = {
        id: 'account-1',
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Account',
        type: 'eip155:eoa',
        scopes: [],
        metadata: {},
      };
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: null,
        rewardsAccountScope:
          mockRewardsAccountScope as unknown as InternalAccount,
        estimatedPoints: 100,
      };

      const { getByTestId, queryByTestId } = render(
        <PredictFeeSummary {...props} />,
      );

      expect(getByTestId('add-rewards-account')).toBeOnTheScreen();
      expect(queryByTestId('rewards-animation')).toBeNull();
    });

    it('does not display rewards row when both accountOptedIn and rewardsAccountScope are null/false', () => {
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: false,
        rewardsAccountScope: null,
        estimatedPoints: 100,
      };

      const { queryByText, queryByTestId } = render(
        <PredictFeeSummary {...props} />,
      );

      expect(queryByText('Est. points')).toBeNull();
      expect(queryByTestId('rewards-animation')).toBeNull();
      expect(queryByTestId('add-rewards-account')).toBeNull();
    });

    it('displays RewardsAnimations when accountOptedIn is true even if rewardsAccountScope is provided', () => {
      const mockRewardsAccountScope = {
        id: 'account-1',
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Account',
        type: 'eip155:eoa',
        scopes: [],
        metadata: {},
      };
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: true,
        rewardsAccountScope:
          mockRewardsAccountScope as unknown as InternalAccount,
        estimatedPoints: 50,
      };

      const { getByTestId, queryByTestId } = render(
        <PredictFeeSummary {...props} />,
      );

      expect(getByTestId('rewards-animation')).toBeOnTheScreen();
      expect(queryByTestId('add-rewards-account')).toBeNull();
    });

    it('displays loading state when isLoadingRewards is true', () => {
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: true,
        estimatedPoints: 50,
        isLoadingRewards: true,
      };

      const { getByTestId } = render(<PredictFeeSummary {...props} />);

      const animation = getByTestId('rewards-animation');
      expect(animation).toBeOnTheScreen();
      expect(animation.props['data-state']).toBe('Loading');
    });

    it('displays error state when hasRewardsError is true', () => {
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: true,
        estimatedPoints: 50,
        hasRewardsError: true,
      };

      const { getByTestId } = render(<PredictFeeSummary {...props} />);

      const animation = getByTestId('rewards-animation');
      expect(animation).toBeOnTheScreen();
      expect(animation.props['data-state']).toBe('ErrorState');
    });

    it('displays idle state when not loading and no error', () => {
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: true,
        estimatedPoints: 50,
        isLoadingRewards: false,
        hasRewardsError: false,
      };

      const { getByTestId } = render(<PredictFeeSummary {...props} />);

      const animation = getByTestId('rewards-animation');
      expect(animation).toBeOnTheScreen();
      expect(animation.props['data-state']).toBe('Idle');
    });

    it('displays error tooltip when hasRewardsError is true', () => {
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: true,
        estimatedPoints: 50,
        hasRewardsError: true,
      };

      const { getByTestId } = render(<PredictFeeSummary {...props} />);

      expect(getByTestId('value-tooltip')).toBeOnTheScreen();
    });

    it('does not display error tooltip when hasRewardsError is false', () => {
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: true,
        estimatedPoints: 50,
        hasRewardsError: false,
      };

      const { queryByTestId } = render(<PredictFeeSummary {...props} />);

      expect(queryByTestId('value-tooltip')).toBeNull();
    });

    it('handles null estimatedPoints when account is opted in', () => {
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: true,
        estimatedPoints: null,
      };

      const { getByText } = render(<PredictFeeSummary {...props} />);

      expect(getByText('0 points')).toBeOnTheScreen();
    });
  });

  describe('Rewards Row Position', () => {
    it('renders rewards row after Total row', () => {
      const props = {
        ...defaultProps,
        shouldShowRewardsRow: true,
        accountOptedIn: true,
        estimatedPoints: 50,
      };

      const { toJSON } = render(<PredictFeeSummary {...props} />);
      const tree = JSON.stringify(toJSON());

      const totalIndex = tree.indexOf('Total');
      const estPointsIndex = tree.indexOf('Est. points');

      expect(totalIndex).toBeGreaterThan(-1);
      expect(estPointsIndex).toBeGreaterThan(totalIndex);
    });
  });
});
