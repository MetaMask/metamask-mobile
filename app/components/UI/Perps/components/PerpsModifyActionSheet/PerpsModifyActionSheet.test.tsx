import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsModifyActionSheet from './PerpsModifyActionSheet';
import type { Position } from '../../controllers/types';

// Mock dependencies
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      contentContainer: {},
      actionItem: {},
      actionItemBorder: {},
      actionIconContainer: {},
      actionTextContainer: {},
      iconColor: { color: '#000000' },
    },
  }),
}));

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

// Mock BottomSheet
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactModule = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ReactModule.forwardRef(
        (
          { children, testID }: { children: React.ReactNode; testID?: string },
          _ref: unknown,
        ) => ReactModule.createElement(View, { testID }, children),
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const ReactModule = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return function MockBottomSheetHeader({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return ReactModule.createElement(
        View,
        { testID: 'bottom-sheet-header' },
        children,
      );
    };
  },
);

// Mock Icon component
jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  __esModule: true,
  default: function MockIcon() {
    return null;
  },
  IconName: {
    Add: 'Add',
    Minus: 'Minus',
    SwapHorizontal: 'SwapHorizontal',
  },
  IconSize: {
    Md: 'Md',
  },
}));

// Mock Text component
jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const ReactModule = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockText({ children }: { children: React.ReactNode }) {
      return ReactModule.createElement(Text, null, children);
    },
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodyMDBold: 'BodyMDBold',
      BodySM: 'BodySM',
    },
    TextColor: {
      Alternative: 'Alternative',
    },
  };
});

// Mock Box component
jest.mock('@metamask/design-system-react-native', () => ({
  Box: function MockBox({ children }: { children: React.ReactNode }) {
    const ReactModule = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactModule.createElement(View, null, children);
  },
}));

describe('PerpsModifyActionSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnActionSelect = jest.fn();

  const mockPosition: Position = {
    coin: 'ETH',
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
    expect(mockOnClose).toHaveBeenCalled();
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
    expect(mockOnClose).toHaveBeenCalled();
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
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when action is selected', () => {
    render(
      <PerpsModifyActionSheet
        onClose={mockOnClose}
        onActionSelect={mockOnActionSelect}
        position={mockPosition}
      />,
    );

    fireEvent.press(screen.getByText('Add to Position'));

    expect(mockOnClose).toHaveBeenCalled();
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
