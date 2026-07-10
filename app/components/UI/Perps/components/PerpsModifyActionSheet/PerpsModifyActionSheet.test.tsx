import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsModifyActionSheet from './PerpsModifyActionSheet';
import { type Position } from '@metamask/perps-controller';
import { PerpsModifyActionSheetSelectorsIDs } from '../../Perps.testIds';

jest.mock('@metamask/design-system-react-native', () => {
  const MockReact = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  const BottomSheet = MockReact.forwardRef(
    (
      {
        children,
        testID,
      }: {
        children: React.ReactNode;
        testID?: string;
      },
      ref: React.Ref<{
        onOpenBottomSheet: () => void;
        onCloseBottomSheet: (callback?: () => void) => void;
      }>,
    ) => {
      MockReact.useImperativeHandle(ref, () => ({
        onOpenBottomSheet: jest.fn(),
        onCloseBottomSheet: (callback?: () => void) => {
          callback?.();
        },
      }));

      return <View testID={testID}>{children}</View>;
    },
  );
  BottomSheet.displayName = 'BottomSheet';

  const BottomSheetHeader = ({ children }: { children: React.ReactNode }) => (
    <View testID="bottom-sheet-header">
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </View>
  );

  return {
    ...actual,
    BottomSheet,
    BottomSheetHeader,
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => {
    const translations: Record<string, string> = {
      'perps.modify.title': 'Modify Position',
      'perps.modify.add_to_position': 'Add to Position',
      'perps.modify.add_to_position_description': 'Increase your position size',
      'perps.modify.reduce_position': 'Reduce Position',
      'perps.modify.reduce_position_description': 'Decrease your position size',
      'perps.modify.flip_position': 'Flip Position',
      'perps.modify.flip_position_description':
        'Reverse your position direction',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsModifyActionSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnActionSelect = jest.fn();

  const mockPosition: Position = {
    symbol: 'ETH',
    size: '2.5',
    marginUsed: '500',
    entryPrice: '2000',
    liquidationPrice: '1900',
    unrealizedPnl: '100',
    returnOnEquity: '0.20',
    leverage: { value: 10, type: 'isolated' },
    cumulativeFunding: { sinceOpen: '5', allTime: '10', sinceChange: '2' },
    positionValue: '5000',
    maxLeverage: 50,
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modify position title', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
      />,
    );

    expect(screen.getByText('Modify Position')).toBeOnTheScreen();
  });

  it('renders add to position option', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
      />,
    );

    expect(screen.getByText('Add to Position')).toBeOnTheScreen();
    expect(screen.getByText('Increase your position size')).toBeOnTheScreen();
  });

  it('renders reduce position option', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
      />,
    );

    expect(screen.getByText('Reduce Position')).toBeOnTheScreen();
    expect(screen.getByText('Decrease your position size')).toBeOnTheScreen();
  });

  it('renders flip position option', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
      />,
    );

    expect(screen.getByText('Flip Position')).toBeOnTheScreen();
    expect(
      screen.getByText('Reverse your position direction'),
    ).toBeOnTheScreen();
  });

  it('calls onActionSelect with add_to_position when add option is pressed', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
        testID="modify-sheet"
      />,
    );

    fireEvent.press(screen.getByText('Add to Position'));

    expect(mockOnActionSelect).toHaveBeenCalledWith('add_to_position');
  });

  it('calls onActionSelect with reduce_position when reduce option is pressed', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
        testID="modify-sheet"
      />,
    );

    fireEvent.press(screen.getByText('Reduce Position'));

    expect(mockOnActionSelect).toHaveBeenCalledWith('reduce_position');
  });

  it('calls onActionSelect with flip_position when flip option is pressed', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
        testID="modify-sheet"
      />,
    );

    fireEvent.press(screen.getByText('Flip Position'));

    expect(mockOnActionSelect).toHaveBeenCalledWith('flip_position');
  });

  it('does not call onClose directly when action is selected', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
      />,
    );

    fireEvent.press(screen.getByText('Add to Position'));

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('renders with testID when provided', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
        testID="test-modify-sheet"
      />,
    );

    expect(screen.getByTestId('test-modify-sheet')).toBeOnTheScreen();
  });

  it('uses stable default testIDs when none are provided', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
      />,
    );

    expect(
      screen.getByTestId(PerpsModifyActionSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsModifyActionSheetSelectorsIDs.FLIP_POSITION),
    ).toBeOnTheScreen();
  });

  it('renders action items with correct testIDs', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
        testID="modify-sheet"
      />,
    );

    expect(
      screen.getByTestId('modify-sheet-add_to_position'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('modify-sheet-reduce_position'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('modify-sheet-flip_position')).toBeOnTheScreen();
  });

  it('works with null position', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={null}
      />,
    );

    expect(screen.getByText('Modify Position')).toBeOnTheScreen();
  });

  it('renders with isVisible true by default', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
        testID="modify-sheet"
      />,
    );

    expect(screen.getByTestId('modify-sheet')).toBeOnTheScreen();
  });

  it('renders with external sheetRef', () => {
    const mockSheetRef = { current: null };

    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
        sheetRef={mockSheetRef as never}
        testID="modify-sheet"
      />,
    );

    expect(screen.getByTestId('modify-sheet')).toBeOnTheScreen();
  });
});
