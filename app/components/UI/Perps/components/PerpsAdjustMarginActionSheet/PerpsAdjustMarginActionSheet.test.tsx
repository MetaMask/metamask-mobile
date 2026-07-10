import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsAdjustMarginActionSheet from './PerpsAdjustMarginActionSheet';

jest.mock('../../../../../util/theme/themeUtils', () => ({
  useElevatedSurface: () => 'bg-default',
}));

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
      'perps.adjust_margin.title': 'Adjust Margin',
      'perps.adjust_margin.add_margin': 'Add Margin',
      'perps.adjust_margin.add_margin_description':
        'Increase margin to reduce liquidation risk',
      'perps.adjust_margin.reduce_margin': 'Remove Margin',
      'perps.adjust_margin.reduce_margin_description':
        'Withdraw excess margin from position',
    };
    return translations[key] || key;
  }),
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

  // TODO: Re-enable when remove margin feature is re-enabled
  // it('renders reduce margin option', () => {
  //   render(
  //     <PerpsAdjustMarginActionSheet
  //       onClose={mockOnClose}
  //       onSelectAction={mockOnSelectAction}
  //     />,
  //   );

  //   expect(screen.getByText('Remove Margin')).toBeOnTheScreen();
  //   expect(
  //     screen.getByText('Withdraw excess margin from position'),
  //   ).toBeOnTheScreen();
  // });

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

  // TODO: Re-enable when remove margin feature is re-enabled
  // it('calls onSelectAction with reduce_margin when reduce margin is pressed', () => {
  //   render(
  //     <PerpsAdjustMarginActionSheet
  //       onClose={mockOnClose}
  //       onSelectAction={mockOnSelectAction}
  //     />,
  //   );

  //   fireEvent.press(screen.getByText('Remove Margin'));

  //   expect(mockOnSelectAction).toHaveBeenCalledWith('reduce_margin');
  // });

  it('does not call onClose directly when action is selected', () => {
    render(
      <PerpsAdjustMarginActionSheet
        onClose={mockOnClose}
        onSelectAction={mockOnSelectAction}
      />,
    );

    fireEvent.press(screen.getByText('Add Margin'));

    expect(mockOnClose).not.toHaveBeenCalled();
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
