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
    totalClaimableAmount: 150.75,
    onClaimPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the component with correct title', () => {
      renderWithProvider(<MarketsWonCard {...defaultProps} />);

      expect(screen.getByText('Markets won')).toBeOnTheScreen();
    });

    it('displays the claimable amount in the button', () => {
      renderWithProvider(<MarketsWonCard {...defaultProps} />);

      expect(screen.getByText('Claim $150.75')).toBeOnTheScreen();
    });

    it('renders position icons for up to 3 positions', () => {
      renderWithProvider(<MarketsWonCard {...defaultProps} />);

      // Should render images for the first 3 positions
      // We can verify this by checking the component renders without errors
      // and the overflow count is not shown (since we have exactly 3 positions)
      expect(screen.queryByText(/^\+/)).not.toBeOnTheScreen();
    });

    it('shows overflow count when more than 3 positions', () => {
      const manyPositions = [
        ...mockPositions,
        {
          conditionId: 'condition-4',
          outcomeIndex: 0,
          icon: 'https://example.com/icon4.png',
        } as PredictPositionType,
        {
          conditionId: 'condition-5',
          outcomeIndex: 1,
          icon: 'https://example.com/icon5.png',
        } as PredictPositionType,
      ];

      renderWithProvider(
        <MarketsWonCard {...defaultProps} positions={manyPositions} />,
      );

      expect(screen.getByText('+2')).toBeOnTheScreen();
    });

    it('does not show overflow count when 3 or fewer positions', () => {
      renderWithProvider(<MarketsWonCard {...defaultProps} />);

      expect(screen.queryByText(/^\+/)).not.toBeOnTheScreen();
    });
  });

  describe('Amount Formatting', () => {
    it('formats claimable amount to 2 decimal places', () => {
      renderWithProvider(
        <MarketsWonCard {...defaultProps} totalClaimableAmount={123.456} />,
      );

      expect(screen.getByText('Claim $123.46')).toBeOnTheScreen();
    });

    it('handles zero amount correctly', () => {
      renderWithProvider(
        <MarketsWonCard {...defaultProps} totalClaimableAmount={0} />,
      );

      expect(screen.getByText('Claim $0.00')).toBeOnTheScreen();
    });

    it('handles large amounts correctly', () => {
      renderWithProvider(
        <MarketsWonCard {...defaultProps} totalClaimableAmount={999999.99} />,
      );

      expect(screen.getByText('Claim $999999.99')).toBeOnTheScreen();
    });
  });

  describe('Position Display Logic', () => {
    it('handles empty positions array', () => {
      renderWithProvider(<MarketsWonCard {...defaultProps} positions={[]} />);

      expect(screen.getByText('Markets won')).toBeOnTheScreen();
      expect(screen.getByText('Claim $150.75')).toBeOnTheScreen();
      // Should not show overflow count when no positions
      expect(screen.queryByText(/^\+/)).not.toBeOnTheScreen();
    });

    it('handles single position', () => {
      const singlePosition = [mockPositions[0]];
      renderWithProvider(
        <MarketsWonCard {...defaultProps} positions={singlePosition} />,
      );

      // Should not show overflow count for single position
      expect(screen.queryByText(/^\+/)).not.toBeOnTheScreen();
    });

    it('handles exactly 3 positions', () => {
      renderWithProvider(<MarketsWonCard {...defaultProps} />);

      // Should not show overflow count for exactly 3 positions
      expect(screen.queryByText(/^\+/)).not.toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles positions with missing icons gracefully', () => {
      const positionsWithMissingIcons = [
        {
          conditionId: 'condition-1',
          outcomeIndex: 0,
          icon: '',
        } as PredictPositionType,
        {
          conditionId: 'condition-2',
          outcomeIndex: 1,
          icon: 'https://example.com/icon2.png',
        } as PredictPositionType,
      ];

      renderWithProvider(
        <MarketsWonCard
          {...defaultProps}
          positions={positionsWithMissingIcons}
        />,
      );

      // Should still render the component without crashing
      expect(screen.getByText('Markets won')).toBeOnTheScreen();
    });

    it('handles very large position counts', () => {
      const manyPositions = Array.from({ length: 10 }, (_, i) => ({
        conditionId: `condition-${i}`,
        outcomeIndex: 0,
        icon: `https://example.com/icon${i}.png`,
      })) as PredictPositionType[];

      renderWithProvider(
        <MarketsWonCard {...defaultProps} positions={manyPositions} />,
      );

      expect(screen.getByText('+7')).toBeOnTheScreen();
    });
  });
});
