import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PredictFeeSummary from './PredictFeeSummary';

jest.mock('../../utils/format', () => ({
  formatPrice: jest.fn((value, options) =>
    value !== undefined
      ? `$${value.toFixed(options?.maximumDecimals ?? 2)}`
      : '$0.00',
  ),
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
      field: { label: { text: string } };
      value: { label: React.ReactNode };
    }) =>
      React.createElement(
        View,
        { testID: 'key-value-row' },
        React.createElement(RNText, null, field.label.text),
        value.label,
      );
  },
);

// Mock RewardsAnimations
jest.mock('../../../Rewards/components/RewardPointsAnimation', () => {
  const React = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ value }: { value: number }) =>
      React.createElement(
        RNText,
        { testID: 'rewards-animation' },
        `${value} points`,
      ),
    RewardAnimationState: {
      Loading: 'Loading',
      ErrorState: 'ErrorState',
      Idle: 'Idle',
    },
  };
});

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
    it('does not display rewards row when shouldShowRewards is false', () => {
      const props = {
        ...defaultProps,
        shouldShowRewards: false,
        estimatedPoints: 100,
      };

      const { queryByText, queryByTestId } = render(
        <PredictFeeSummary {...props} />,
      );

      expect(queryByText('Est. points')).toBeNull();
      expect(queryByTestId('rewards-animation')).toBeNull();
    });

    it('displays rewards row when shouldShowRewards is true', () => {
      const props = {
        ...defaultProps,
        shouldShowRewards: true,
        estimatedPoints: 50,
      };

      const { getByText, getByTestId } = render(
        <PredictFeeSummary {...props} />,
      );

      expect(getByText('Est. points')).toBeOnTheScreen();
      expect(getByTestId('rewards-animation')).toBeOnTheScreen();
    });

    it('displays correct estimated points value', () => {
      const props = {
        ...defaultProps,
        shouldShowRewards: true,
        estimatedPoints: 123,
      };

      const { getByText } = render(<PredictFeeSummary {...props} />);

      expect(getByText('123 points')).toBeOnTheScreen();
    });

    it('displays zero points when estimatedPoints is 0', () => {
      const props = {
        ...defaultProps,
        shouldShowRewards: true,
        estimatedPoints: 0,
      };

      const { getByText } = render(<PredictFeeSummary {...props} />);

      expect(getByText('0 points')).toBeOnTheScreen();
    });
  });

  describe('Rewards Row Position', () => {
    it('renders rewards row after Total row', () => {
      const props = {
        ...defaultProps,
        shouldShowRewards: true,
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
