import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsSlippageBottomSheet from './PerpsSlippageBottomSheet';
import { PerpsSlippageConfigSelectorsIDs } from '../../Perps.testIds';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'perps.slippage.config_title': 'Set slippage',
      'perps.slippage.config_description':
        "Your transaction won't go through if the price shifts beyond this threshold.",
      'perps.slippage.set': 'Set',
      'perps.slippage.cancel': 'Cancel',
      'perps.slippage.use_custom_title': 'Use custom slippage',
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

jest.mock('@metamask/design-system-react-native', () => {
  const { TouchableOpacity, Text, View } = jest.requireActual('react-native');
  return {
    ButtonBaseSize: { Sm: 'sm', Md: 'md', Lg: 'lg' },
    ButtonFilter: ({
      children,
      onPress,
      testID,
      isActive,
      startIconName,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      isActive?: boolean;
      startIconName?: string;
    }) => (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        accessibilityState={{ selected: !!isActive }}
      >
        {startIconName ? <Text>{`icon:${startIconName}`}</Text> : null}
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    ButtonIcon: ({
      iconName,
      onPress,
      testID,
    }: {
      iconName: string;
      onPress?: () => void;
      testID?: string;
    }) => (
      <TouchableOpacity testID={testID} onPress={onPress}>
        <Text>{`icon:${iconName}`}</Text>
      </TouchableOpacity>
    ),
    ButtonIconSize: { Sm: 'sm', Md: 'md', Lg: 'lg' },
    ButtonIconVariant: {
      Default: 'default',
      Filled: 'filled',
      Floating: 'floating',
    },
    IconName: { Edit: 'Edit', Add: 'Add', Minus: 'Minus' },
    View,
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

  it('marks the edit chip as selected when current value is custom', () => {
    render(
      <PerpsSlippageBottomSheet {...defaultProps} currentValueBps={250} />,
    );
    const chip = screen.getByTestId(PerpsSlippageConfigSelectorsIDs.EDIT_CHIP);
    expect(chip.props.accessibilityState?.selected).toBe(true);
  });

  it('commits a value chosen via the custom sheet on Set', () => {
    render(<PerpsSlippageBottomSheet {...defaultProps} />);
    fireEvent.press(
      screen.getByTestId(PerpsSlippageConfigSelectorsIDs.EDIT_CHIP),
    );
    // Custom sheet mock saves 450 bps
    fireEvent.press(screen.getByTestId('mock-custom-save-450'));
    // Back on main sheet; Set commits 450
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
});
