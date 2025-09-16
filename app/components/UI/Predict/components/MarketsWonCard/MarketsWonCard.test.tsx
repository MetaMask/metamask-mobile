import React from 'react';
import { screen } from '@testing-library/react-native';
import MarketsWonCard from './MarketsWonCard';
import { PredictPosition as PredictPositionType } from '../../types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

// Mock dependencies
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((...args) => args.join(' ')),
  })),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text: RNText } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    Text: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <RNText testID={testID} {...props}>
        {children}
      </RNText>
    ),
    Icon: ({
      name,
      testID,
      ...props
    }: {
      name: string;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <View testID={testID} {...props}>
        <RNText>{name}</RNText>
      </View>
    ),
    TextVariant: {
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
    },
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxAlignItems: {
      Center: 'center',
    },
    BoxJustifyContent: {
      Between: 'space-between',
    },
    FontWeight: {
      Medium: 'medium',
    },
    IconName: {
      Info: 'Info',
      ArrowRight: 'ArrowRight',
    },
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      label,
      onPress,
      testID,
      ...props
    }: {
      label: string;
      onPress: () => void;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <TouchableOpacity testID={testID} onPress={onPress} {...props}>
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
    ButtonSize: {
      Lg: 'lg',
    },
    ButtonVariants: {
      Primary: 'primary',
    },
  };
});

// Mock Image component
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const { Image: RNImage } = RN;
  return {
    ...RN,
    Image: ({
      source,
      testID,
      ...props
    }: {
      source: { uri: string };
      testID?: string;
      [key: string]: unknown;
    }) => <RNImage testID={testID} source={source} {...props} />,
  };
});

describe('MarketsWonCard', () => {
  const mockPositions: PredictPositionType[] = [
    {
      conditionId: 'condition-1',
      outcomeIndex: 0,
      icon: 'https://example.com/icon1.png',
      // Add other required properties based on PredictPosition type
    } as PredictPositionType,
    {
      conditionId: 'condition-2',
      outcomeIndex: 1,
      icon: 'https://example.com/icon2.png',
    } as PredictPositionType,
    {
      conditionId: 'condition-3',
      outcomeIndex: 0,
      icon: 'https://example.com/icon3.png',
    } as PredictPositionType,
  ];

  const defaultProps = {
    positions: mockPositions,
    numberOfMarketsWon: 2,
    totalClaimableAmount: 45.2,
    unrealizedAmount: 8.63,
    unrealizedPercent: 3.9,
    onClaimPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the component with won markets row when numberOfMarketsWon is provided', () => {
      renderWithProvider(<MarketsWonCard {...defaultProps} />);

      expect(screen.getByText('Won 2 markets')).toBeOnTheScreen();
      expect(screen.getByText('Claim $45.20')).toBeOnTheScreen();
    });

    it('renders singular form when numberOfMarketsWon is 1', () => {
      renderWithProvider(
        <MarketsWonCard {...defaultProps} numberOfMarketsWon={1} />,
      );

      expect(screen.getByText('Won 1 market')).toBeOnTheScreen();
    });

    it('renders plural form when numberOfMarketsWon is greater than 1', () => {
      renderWithProvider(
        <MarketsWonCard {...defaultProps} numberOfMarketsWon={5} />,
      );

      expect(screen.getByText('Won 5 markets')).toBeOnTheScreen();
    });

    it('does not show won markets row when numberOfMarketsWon is 0', () => {
      renderWithProvider(
        <MarketsWonCard {...defaultProps} numberOfMarketsWon={0} />,
      );

      expect(screen.queryByText('Won 0 markets')).not.toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('renders the unrealized P&L row always', () => {
      renderWithProvider(<MarketsWonCard {...defaultProps} />);

      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      expect(screen.getByText('+$8.63 (+3.9%)')).toBeOnTheScreen();
    });

    it('does not show won markets row when numberOfMarketsWon is undefined', () => {
      const { numberOfMarketsWon, ...propsWithoutWon } = defaultProps;
      renderWithProvider(<MarketsWonCard {...propsWithoutWon} />);

      expect(screen.queryByText(/Won \d+ markets/)).not.toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('shows claim button only when totalClaimableAmount and onClaimPress are provided', () => {
      renderWithProvider(<MarketsWonCard {...defaultProps} />);

      expect(screen.getByText('Claim $45.20')).toBeOnTheScreen();
    });

    it('does not show claim button when onClaimPress is not provided', () => {
      const { onClaimPress, ...propsWithoutCallback } = defaultProps;
      renderWithProvider(<MarketsWonCard {...propsWithoutCallback} />);

      expect(screen.queryByText('Claim $45.20')).not.toBeOnTheScreen();
    });
  });

  describe('Amount Formatting', () => {
    it('formats unrealized amount with correct sign and decimal places', () => {
      renderWithProvider(
        <MarketsWonCard
          {...defaultProps}
          unrealizedAmount={123.456}
          unrealizedPercent={5.67}
        />,
      );

      expect(screen.getByText('+$123.46 (+5.7%)')).toBeOnTheScreen();
    });

    it('formats negative unrealized amount correctly', () => {
      renderWithProvider(
        <MarketsWonCard
          {...defaultProps}
          unrealizedAmount={-50.25}
          unrealizedPercent={-2.1}
        />,
      );

      expect(screen.getByText('-$50.25 (-2.1%)')).toBeOnTheScreen();
    });

    it('handles zero unrealized amount correctly', () => {
      renderWithProvider(
        <MarketsWonCard
          {...defaultProps}
          unrealizedAmount={0}
          unrealizedPercent={0}
        />,
      );

      expect(screen.getByText('+$0.00 (+0.0%)')).toBeOnTheScreen();
    });

    it('formats claimable amount to 2 decimal places', () => {
      renderWithProvider(
        <MarketsWonCard {...defaultProps} totalClaimableAmount={123.456} />,
      );

      expect(screen.getByText('Claim $123.46')).toBeOnTheScreen();
    });

    it('handles zero claimable amount correctly', () => {
      renderWithProvider(
        <MarketsWonCard {...defaultProps} totalClaimableAmount={0} />,
      );

      expect(screen.getByText('Claim $0.00')).toBeOnTheScreen();
    });
  });

  describe('Conditional Rendering Logic', () => {
    it('shows won markets row when numberOfMarketsWon is greater than 0', () => {
      renderWithProvider(
        <MarketsWonCard {...defaultProps} numberOfMarketsWon={5} />,
      );

      expect(screen.getByText('Won 5 markets')).toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('hides won markets row when numberOfMarketsWon is 0', () => {
      renderWithProvider(
        <MarketsWonCard {...defaultProps} numberOfMarketsWon={0} />,
      );

      expect(screen.queryByText(/Won \d+ markets/)).not.toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('hides won markets row when numberOfMarketsWon is undefined', () => {
      const { numberOfMarketsWon, ...propsWithoutWon } = defaultProps;
      renderWithProvider(<MarketsWonCard {...propsWithoutWon} />);

      expect(screen.queryByText(/Won \d+ markets/)).not.toBeOnTheScreen();
      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
    });

    it('always shows unrealized P&L row regardless of other props', () => {
      renderWithProvider(
        <MarketsWonCard unrealizedAmount={100} unrealizedPercent={10} />,
      );

      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      expect(screen.getByText('+$100.00 (+10.0%)')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles very large unrealized amounts', () => {
      renderWithProvider(
        <MarketsWonCard
          {...defaultProps}
          unrealizedAmount={999999.99}
          unrealizedPercent={999.9}
        />,
      );

      expect(screen.getByText('+$999999.99 (+999.9%)')).toBeOnTheScreen();
    });

    it('handles very small unrealized amounts', () => {
      renderWithProvider(
        <MarketsWonCard
          {...defaultProps}
          unrealizedAmount={0.01}
          unrealizedPercent={0.1}
        />,
      );

      expect(screen.getByText('+$0.01 (+0.1%)')).toBeOnTheScreen();
    });

    it('handles missing optional props gracefully', () => {
      renderWithProvider(
        <MarketsWonCard unrealizedAmount={50} unrealizedPercent={5} />,
      );

      expect(screen.getByText('Unrealized P&L')).toBeOnTheScreen();
      expect(screen.getByText('+$50.00 (+5.0%)')).toBeOnTheScreen();
    });
  });
});
