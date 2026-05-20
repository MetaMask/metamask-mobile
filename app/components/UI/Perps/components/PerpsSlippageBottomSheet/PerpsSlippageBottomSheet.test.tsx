import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsSlippageBottomSheet from './PerpsSlippageBottomSheet';
import { PerpsSlippageConfigSelectorsIDs } from '../../Perps.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'perps.slippage.config_title': 'Set slippage',
      'perps.slippage.config_description':
        "Your transaction won't go through if the price shifts beyond this threshold.",
      'perps.slippage.input_label': 'Slippage input',
      'perps.slippage.set': 'Set',
      'perps.slippage.custom': 'Custom',
    };
    if (key === 'perps.slippage.out_of_range' && params) {
      return `Must be between ${params.min}% and ${params.max}%`;
    }
    return translations[key] || key;
  }),
}));

const { mockTheme } = jest.requireActual('../../../../../util/theme');

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => mockTheme,
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactModule = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ReactModule.forwardRef(
        ({ children }: { children: React.ReactNode }, _ref: unknown) =>
          ReactModule.createElement(View, null, children),
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View } = jest.requireActual('react-native');
    return function MockBottomSheetHeader({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return <View>{children}</View>;
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    return function MockBottomSheetFooter({
      buttonPropsArray,
    }: {
      buttonPropsArray: {
        label: string;
        onPress: () => void;
        isDisabled?: boolean;
        testID?: string;
      }[];
    }) {
      return (
        <View>
          {buttonPropsArray.map((btn) => (
            <TouchableOpacity
              key={btn.testID}
              testID={btn.testID}
              onPress={btn.onPress}
              disabled={btn.isDisabled}
            >
              <Text>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    };
  },
);

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  const MockText = ({ children, testID, ...rest }: Record<string, unknown>) => (
    <Text testID={testID as string} {...rest}>
      {children as React.ReactNode}
    </Text>
  );
  MockText.displayName = 'MockText';
  return {
    __esModule: true,
    default: MockText,
    TextColor: {
      Alternative: 'Alternative',
      Error: 'Error',
      Default: 'Default',
      Inverse: 'Inverse',
    },
    TextVariant: {
      HeadingMD: 'HeadingMD',
      BodySM: 'BodySM',
      BodyLGMedium: 'BodyLGMedium',
    },
  };
});

const defaultProps = {
  isVisible: true,
  currentValueBps: 300, // 3%
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

  it('renders three preset chips and a Custom chip when value matches a preset', () => {
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
      screen.getByTestId(PerpsSlippageConfigSelectorsIDs.CUSTOM),
    ).toBeOnTheScreen();
  });

  it('saves preset bps value when preset chip is pressed and Set tapped', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);
    fireEvent.press(screen.getByTestId('perps-slippage-config-preset-2'));
    fireEvent.press(screen.getByTestId(PerpsSlippageConfigSelectorsIDs.SET));
    expect(defaultProps.onSave).toHaveBeenCalledWith(200);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('opens custom input when Custom chip is tapped', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);
    fireEvent.press(screen.getByTestId(PerpsSlippageConfigSelectorsIDs.CUSTOM));
    expect(
      screen.getByTestId(PerpsSlippageConfigSelectorsIDs.INPUT),
    ).toBeOnTheScreen();
  });

  it('starts in custom mode when current value is not a preset', () => {
    render(
      <PerpsSlippageBottomSheet {...defaultProps} currentValueBps={250} />,
    );
    const input = screen.getByTestId(PerpsSlippageConfigSelectorsIDs.INPUT);
    expect(input.props.value).toBe('2.5');
  });

  it('saves custom bps value when valid', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);
    fireEvent.press(screen.getByTestId(PerpsSlippageConfigSelectorsIDs.CUSTOM));
    const input = screen.getByTestId(PerpsSlippageConfigSelectorsIDs.INPUT);
    fireEvent.changeText(input, '4.5');
    fireEvent.press(screen.getByTestId(PerpsSlippageConfigSelectorsIDs.SET));
    expect(defaultProps.onSave).toHaveBeenCalledWith(450);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows error for out-of-range custom value', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);
    fireEvent.press(screen.getByTestId(PerpsSlippageConfigSelectorsIDs.CUSTOM));
    const input = screen.getByTestId(PerpsSlippageConfigSelectorsIDs.INPUT);
    fireEvent.changeText(input, '99');
    expect(
      screen.getByTestId(PerpsSlippageConfigSelectorsIDs.ERROR),
    ).toBeOnTheScreen();
  });

  it('does not show error for empty custom input', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);
    fireEvent.press(screen.getByTestId(PerpsSlippageConfigSelectorsIDs.CUSTOM));
    const input = screen.getByTestId(PerpsSlippageConfigSelectorsIDs.INPUT);
    fireEvent.changeText(input, '');
    expect(
      screen.queryByTestId(PerpsSlippageConfigSelectorsIDs.ERROR),
    ).not.toBeOnTheScreen();
  });

  it('does not save when custom value is invalid', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);
    fireEvent.press(screen.getByTestId(PerpsSlippageConfigSelectorsIDs.CUSTOM));
    const input = screen.getByTestId(PerpsSlippageConfigSelectorsIDs.INPUT);
    fireEvent.changeText(input, '99');
    fireEvent.press(screen.getByTestId(PerpsSlippageConfigSelectorsIDs.SET));
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });
});
