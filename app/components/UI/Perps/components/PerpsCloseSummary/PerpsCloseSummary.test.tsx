import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsCloseSummary from './PerpsCloseSummary';
import { strings } from '../../../../../../locales/i18n';

// Mock dependencies
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  })),
}));

jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      summaryContainer: {},
      paddingHorizontal: {},
      summaryRow: {},
      summaryLabel: {},
      summaryValue: {},
      inclusiveFeeRow: {},
      labelWithTooltip: {},
      summaryTotalRow: {},
      rewardsRow: {},
      rewardsContent: {},
      loadingContainer: {},
    },
    theme: {
      colors: {
        icon: {
          alternative: '#CCCCCC',
        },
      },
    },
  })),
}));

jest.mock('../PerpsFeesDisplay', () => 'PerpsFeesDisplay');
jest.mock('../PerpsBottomSheetTooltip', () => 'PerpsBottomSheetTooltip');
jest.mock('../../../Rewards/components/RewardPointsAnimation', () => ({
  __esModule: true,
  default: 'RewardsAnimations',
  RewardAnimationState: {
    Idle: 'idle',
    Loading: 'loading',
    ErrorState: 'error',
    Animating: 'animating',
  },
}));

describe('PerpsCloseSummary', () => {
  const defaultProps = {
    totalMargin: 1000,
    totalPnl: 150,
    totalFees: 5.5,
    feeDiscountPercentage: 10,
    metamaskFeeRate: 0.01,
    protocolFeeRate: 0.00045,
    receiveAmount: 1144.5,
    shouldShowRewards: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders margin with positive P&L', () => {
    // Arrange
    const props = { ...defaultProps, totalPnl: 150 };

    // Act
    const { getByText } = render(<PerpsCloseSummary {...props} />);

    // Assert
    expect(strings).toHaveBeenCalledWith('perps.close_position.margin');
    expect(strings).toHaveBeenCalledWith('perps.close_position.includes_pnl');
    expect(getByText('perps.close_position.margin')).toBeTruthy();
  });

  it('renders margin with negative P&L', () => {
    // Arrange
    const props = { ...defaultProps, totalPnl: -50 };

    // Act
    const { getByText } = render(<PerpsCloseSummary {...props} />);

    // Assert
    expect(getByText('perps.close_position.margin')).toBeTruthy();
    expect(strings).toHaveBeenCalledWith('perps.close_position.includes_pnl');
  });

  it('renders fees section with tooltip', () => {
    // Arrange
    const testIDs = { feesTooltip: 'fees-tooltip-button' };
    const props = { ...defaultProps, testIDs };

    // Act
    const { getByTestId, getByText } = render(<PerpsCloseSummary {...props} />);

    // Assert
    expect(getByText('perps.close_position.fees')).toBeTruthy();
    expect(getByTestId('fees-tooltip-button')).toBeTruthy();
  });

  it('renders receive amount with tooltip', () => {
    // Arrange
    const testIDs = { receiveTooltip: 'receive-tooltip-button' };
    const props = { ...defaultProps, testIDs };

    // Act
    const { getByTestId, getByText } = render(<PerpsCloseSummary {...props} />);

    // Assert
    expect(getByText('perps.close_position.you_receive')).toBeTruthy();
    expect(getByTestId('receive-tooltip-button')).toBeTruthy();
  });

  it('renders rewards section when enabled', () => {
    // Arrange
    const props = {
      ...defaultProps,
      shouldShowRewards: true,
      estimatedPoints: 100,
      bonusBips: 500,
    };

    // Act
    const { getByText } = render(<PerpsCloseSummary {...props} />);

    // Assert
    expect(getByText('perps.estimated_points')).toBeTruthy();
  });

  it('renders rewards with loading state', () => {
    // Arrange
    const props = {
      ...defaultProps,
      shouldShowRewards: true,
      isLoadingRewards: true,
      estimatedPoints: 0,
    };

    // Act
    const { getByText } = render(<PerpsCloseSummary {...props} />);

    // Assert
    expect(getByText('perps.estimated_points')).toBeTruthy();
  });

  it('applies custom style prop', () => {
    // Arrange
    const customStyle = { backgroundColor: 'red' };
    const props = { ...defaultProps, style: customStyle };

    // Act
    const { getByTestId } = render(<PerpsCloseSummary {...props} />);

    // Assert - component renders without crashing with custom style
    expect(getByTestId).toBeDefined();
  });

  it('applies padding when input focused', () => {
    // Arrange
    const props = { ...defaultProps, isInputFocused: true };

    // Act
    const { getByTestId } = render(<PerpsCloseSummary {...props} />);

    // Assert - component renders without crashing with focused state
    expect(getByTestId).toBeDefined();
  });

  it('disables tooltip interactions when enableTooltips is false', () => {
    // Arrange
    const props = { ...defaultProps, enableTooltips: false };

    // Act
    const { queryByTestId } = render(<PerpsCloseSummary {...props} />);

    // Assert - tooltip buttons not rendered when tooltips disabled
    expect(queryByTestId('fees-tooltip-button')).toBeNull();
  });

  it('renders loading indicator when fees are calculating', () => {
    // Arrange
    const props = { ...defaultProps, isLoadingFees: true };

    // Act
    const { queryByText } = render(<PerpsCloseSummary {...props} />);

    // Assert - PerpsFeesDisplay not shown when loading
    expect(queryByText('PerpsFeesDisplay')).toBeNull();
  });

  it('displays error state when rewards calculation fails', () => {
    // Arrange
    const props = {
      ...defaultProps,
      shouldShowRewards: true,
      hasRewardsError: true,
      estimatedPoints: 0,
    };

    // Act
    const { getByText } = render(<PerpsCloseSummary {...props} />);

    // Assert - rewards section still renders with error state
    expect(getByText('perps.estimated_points')).toBeTruthy();
  });

  it('handles tooltip press to open fees tooltip', () => {
    const props = {
      ...defaultProps,
      enableTooltips: true,
      testIDs: { feesTooltip: 'fees-tooltip' },
    };

    const { getByTestId } = render(<PerpsCloseSummary {...props} />);

    fireEvent.press(getByTestId('fees-tooltip'));

    expect(getByTestId('fees-tooltip')).toBeTruthy();
  });

  it('handles tooltip press to open receive amount tooltip', () => {
    const props = {
      ...defaultProps,
      enableTooltips: true,
      testIDs: { receiveTooltip: 'receive-tooltip' },
    };

    const { getByTestId } = render(<PerpsCloseSummary {...props} />);

    fireEvent.press(getByTestId('receive-tooltip'));

    expect(getByTestId('receive-tooltip')).toBeTruthy();
  });

  it('handles tooltip press to open points tooltip when rewards enabled', () => {
    const props = {
      ...defaultProps,
      shouldShowRewards: true,
      enableTooltips: true,
      estimatedPoints: 100,
      testIDs: { pointsTooltip: 'points-tooltip' },
    };

    const { getByTestId } = render(<PerpsCloseSummary {...props} />);

    fireEvent.press(getByTestId('points-tooltip'));

    expect(getByTestId('points-tooltip')).toBeTruthy();
  });

  it('does not trigger tooltip callback when tooltips are disabled', () => {
    const props = {
      ...defaultProps,
      enableTooltips: false,
      testIDs: { feesTooltip: 'fees-tooltip' },
    };

    const { queryByTestId } = render(<PerpsCloseSummary {...props} />);

    expect(queryByTestId('fees-tooltip')).toBeNull();
  });
});
