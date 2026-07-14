import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsSlippageBottomSheet from './PerpsSlippageBottomSheet';
import { PerpsSlippageConfigSelectorsIDs } from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'perps.slippage.config_title': 'Set slippage',
      'perps.slippage.config_description':
        "Your transaction won't go through if the price shifts beyond this threshold.",
      'perps.slippage.set': 'Set',
      'perps.slippage.cancel': 'Cancel',
      'perps.slippage.use_custom_title': 'Use custom slippage',
      'perps.slippage.custom': 'Custom',
    };
    if (key === 'perps.slippage.out_of_range' && params) {
      return `Must be between ${params.min}% and ${params.max}%`;
    }
    return translations[key] || key;
  }),
}));

const mockOnOpenBottomSheet = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const BottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        onClose,
      }: {
        children: React.ReactNode;
        onClose?: () => void;
      },
      ref: React.Ref<{
        onOpenBottomSheet: () => void;
        onCloseBottomSheet: (callback?: () => void) => void;
      }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onOpenBottomSheet: mockOnOpenBottomSheet,
        onCloseBottomSheet: (callback?: () => void) => {
          onClose?.();
          callback?.();
        },
      }));

      return <View testID="bottom-sheet">{children}</View>;
    },
  );
  BottomSheet.displayName = 'BottomSheet';

  return {
    ...actual,
    BottomSheet,
  };
});

jest.mock('./PerpsCustomSlippageBottomSheet', () => {
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      isVisible,
      currentValueBps,
      onClose,
      onSave,
    }: {
      isVisible: boolean;
      currentValueBps: number;
      onClose: () => void;
      onSave: (bps: number) => void;
    }) =>
      isVisible ? (
        <View testID="mock-custom-slippage-sheet">
          <Text>{`current:${currentValueBps}`}</Text>
          <TouchableOpacity testID="mock-custom-cancel" onPress={onClose} />
          <TouchableOpacity
            testID="mock-custom-save-450"
            onPress={() => onSave(450)}
          />
        </View>
      ) : null,
  };
});

const defaultProps = {
  isVisible: true,
  currentValueBps: 300, // 3% (preset)
  onClose: jest.fn(),
  onSave: jest.fn(),
};

describe('PerpsSlippageBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when not visible', () => {
    const { toJSON } = render(
      <PerpsSlippageBottomSheet {...defaultProps} isVisible={false} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders three preset chips and an edit chip when value matches a preset', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);

    expect(
      screen.getByTestId('perps-slippage-config-preset-0.5'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('perps-slippage-config-preset-2'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('perps-slippage-config-preset-3'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsSlippageConfigSelectorsIDs.EDIT_CHIP),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.slippage.config_title')),
    ).toBeOnTheScreen();
  });

  it('saves preset bps value when preset chip is pressed and Set tapped', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(screen.getByTestId('perps-slippage-config-preset-2'));
    fireEvent.press(screen.getByTestId(PerpsSlippageConfigSelectorsIDs.SET));

    expect(defaultProps.onSave).toHaveBeenCalledWith(200);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('opens custom slippage sheet when edit chip is pressed', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(
      screen.getByTestId(PerpsSlippageConfigSelectorsIDs.EDIT_CHIP),
    );

    expect(screen.getByTestId('mock-custom-slippage-sheet')).toBeOnTheScreen();
  });

  it('shows custom percentage on the edit chip when current value is custom', () => {
    render(
      <PerpsSlippageBottomSheet {...defaultProps} currentValueBps={250} />,
    );

    expect(
      screen.getByTestId(PerpsSlippageConfigSelectorsIDs.EDIT_CHIP),
    ).toHaveTextContent('2.5%');
  });

  it('commits a value chosen via the custom sheet on Set', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(
      screen.getByTestId(PerpsSlippageConfigSelectorsIDs.EDIT_CHIP),
    );
    fireEvent.press(screen.getByTestId('mock-custom-save-450'));
    fireEvent.press(screen.getByTestId(PerpsSlippageConfigSelectorsIDs.SET));

    expect(defaultProps.onSave).toHaveBeenCalledWith(450);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('returns to main sheet when custom sheet is cancelled', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(
      screen.getByTestId(PerpsSlippageConfigSelectorsIDs.EDIT_CHIP),
    );
    fireEvent.press(screen.getByTestId('mock-custom-cancel'));

    expect(
      screen.queryByTestId('mock-custom-slippage-sheet'),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsSlippageConfigSelectorsIDs.EDIT_CHIP),
    ).toBeOnTheScreen();
  });

  it('re-opens the main bottom sheet after custom sheet closes', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);

    expect(mockOnOpenBottomSheet).toHaveBeenCalledTimes(1);

    fireEvent.press(
      screen.getByTestId(PerpsSlippageConfigSelectorsIDs.EDIT_CHIP),
    );
    fireEvent.press(screen.getByTestId('mock-custom-cancel'));

    expect(mockOnOpenBottomSheet).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('bottom-sheet')).toBeOnTheScreen();
  });

  it('re-opens the main bottom sheet after custom sheet saves', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);

    expect(mockOnOpenBottomSheet).toHaveBeenCalledTimes(1);

    fireEvent.press(
      screen.getByTestId(PerpsSlippageConfigSelectorsIDs.EDIT_CHIP),
    );
    fireEvent.press(screen.getByTestId('mock-custom-save-450'));

    expect(mockOnOpenBottomSheet).toHaveBeenCalledTimes(2);
    expect(
      screen.getByTestId(PerpsSlippageConfigSelectorsIDs.EDIT_CHIP),
    ).toHaveTextContent('4.5%');
  });
});
