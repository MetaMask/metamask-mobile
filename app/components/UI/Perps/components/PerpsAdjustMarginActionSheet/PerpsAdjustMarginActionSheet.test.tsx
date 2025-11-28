import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsAdjustMarginActionSheet from './PerpsAdjustMarginActionSheet';

// Mock dependencies
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      actionItem: {},
      actionContent: {},
      separator: {},
    },
    theme: {
      colors: {
        border: { muted: '#CCCCCC' },
      },
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => {
    const translations: Record<string, string> = {
      'perps.adjust_margin.title': 'Adjust Margin',
      'perps.adjust_margin.add_margin': 'Add Margin',
      'perps.adjust_margin.add_margin_description':
        'Increase margin to reduce liquidation risk',
      'perps.adjust_margin.reduce_margin': 'Reduce Margin',
      'perps.adjust_margin.reduce_margin_description':
        'Withdraw excess margin from position',
    };
    return translations[key] || key;
  }),
}));

// Mock BottomSheet and BottomSheetHeader
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
    Arrow2Right: 'Arrow2Right',
  },
  IconSize: {
    Lg: 'Lg',
    Md: 'Md',
  },
  IconColor: {
    Primary: 'Primary',
    Alternative: 'Alternative',
  },
}));

describe('PerpsAdjustMarginActionSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the adjust margin title', () => {
    render(
      <PerpsAdjustMarginActionSheet
        onClose={mockOnClose}
        onSelectAction={mockOnSelectAction}
      />,
    );

    expect(screen.getByText('Adjust Margin')).toBeOnTheScreen();
  });

  it('renders add margin option', () => {
    render(
      <PerpsAdjustMarginActionSheet
        onClose={mockOnClose}
        onSelectAction={mockOnSelectAction}
      />,
    );

    expect(screen.getByText('Add Margin')).toBeOnTheScreen();
    expect(
      screen.getByText('Increase margin to reduce liquidation risk'),
    ).toBeOnTheScreen();
  });

  it('renders reduce margin option', () => {
    render(
      <PerpsAdjustMarginActionSheet
        onClose={mockOnClose}
        onSelectAction={mockOnSelectAction}
      />,
    );

    expect(screen.getByText('Reduce Margin')).toBeOnTheScreen();
    expect(
      screen.getByText('Withdraw excess margin from position'),
    ).toBeOnTheScreen();
  });

  it('calls onSelectAction with add_margin when add margin is pressed', () => {
    render(
      <PerpsAdjustMarginActionSheet
        onClose={mockOnClose}
        onSelectAction={mockOnSelectAction}
      />,
    );

    fireEvent.press(screen.getByText('Add Margin'));

    expect(mockOnSelectAction).toHaveBeenCalledWith('add_margin');
  });

  it('calls onSelectAction with reduce_margin when reduce margin is pressed', () => {
    render(
      <PerpsAdjustMarginActionSheet
        onClose={mockOnClose}
        onSelectAction={mockOnSelectAction}
      />,
    );

    fireEvent.press(screen.getByText('Reduce Margin'));

    expect(mockOnSelectAction).toHaveBeenCalledWith('reduce_margin');
  });

  it('calls onClose when action is selected', () => {
    render(
      <PerpsAdjustMarginActionSheet
        onClose={mockOnClose}
        onSelectAction={mockOnSelectAction}
      />,
    );

    fireEvent.press(screen.getByText('Add Margin'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders with testID when provided', () => {
    render(
      <PerpsAdjustMarginActionSheet
        onClose={mockOnClose}
        onSelectAction={mockOnSelectAction}
        testID="test-adjust-margin-sheet"
      />,
    );

    expect(screen.getByTestId('test-adjust-margin-sheet')).toBeOnTheScreen();
  });
});
