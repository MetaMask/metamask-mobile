import React, {
  forwardRef as mockForwardRef,
  useImperativeHandle as mockUseImperativeHandle,
} from 'react';
import {
  View as MockView,
  TouchableOpacity as MockTouchableOpacity,
  Text as MockRNText,
  Platform,
} from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import OtherBottomSheet from './OtherBottomSheet';
import { OtherBottomSheetTestIds } from './OtherBottomSheet.testIds';
import { strings } from '../../../../../locales/i18n';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = jest.fn(() => ({}));
    return tw;
  },
}));

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../util/theme');
  return {
    ...actual,
    useTheme: jest.fn(() => actual.mockTheme),
  };
});

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardProvider: ({ children }: { children: React.ReactNode }) => children,
  useKeyboardState: (selector?: (state: { height: number }) => number) => {
    const state = { height: 0, isVisible: false };
    return selector ? selector(state) : state;
  },
  useResizeMode: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const BottomSheet = mockForwardRef<
    { onCloseBottomSheet: (cb: () => void) => void },
    {
      children: React.ReactNode;
      testID?: string;
      onClose?: () => void;
      keyboardAvoidingViewEnabled?: boolean;
    }
  >(({ children, testID, keyboardAvoidingViewEnabled }, ref) => {
    mockUseImperativeHandle(ref, () => ({
      onCloseBottomSheet: (callback: () => void) => {
        callback?.();
      },
    }));
    return (
      <MockView
        testID={testID}
        accessibilityState={{
          selected: keyboardAvoidingViewEnabled,
        }}
      >
        {children}
      </MockView>
    );
  });
  BottomSheet.displayName = 'BottomSheet';

  const BottomSheetHeader = ({
    children,
    onClose,
    closeButtonProps,
  }: {
    children?: React.ReactNode;
    onClose?: () => void;
    closeButtonProps?: { testID?: string };
  }) => (
    <MockView>
      <MockTouchableOpacity testID={closeButtonProps?.testID} onPress={onClose}>
        <MockView />
      </MockTouchableOpacity>
      {children}
    </MockView>
  );

  const Button = ({
    children,
    onPress,
    testID,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    testID?: string;
    isFullWidth?: boolean;
    variant?: string;
    size?: string;
  }) => (
    <MockTouchableOpacity testID={testID} onPress={onPress}>
      {typeof children === 'string' ? (
        <MockRNText>{children}</MockRNText>
      ) : (
        children
      )}
    </MockTouchableOpacity>
  );

  const Text = ({ children }: { children?: React.ReactNode }) => (
    <MockRNText>{children}</MockRNText>
  );

  const Box = ({ children }: { children?: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );

  return {
    __esModule: true,
    BottomSheet,
    BottomSheetHeader,
    Button,
    Text,
    Box,
    ButtonSize: { Lg: 'Lg' },
    ButtonVariant: { Primary: 'Primary' },
    FontWeight: { Bold: 'Bold' },
    TextVariant: { HeadingSm: 'HeadingSm' },
  };
});

const createProps = (
  overrides: Partial<React.ComponentProps<typeof OtherBottomSheet>> = {},
) => ({
  initialValue: '' as string,
  onClose: jest.fn(),
  onDone: jest.fn(),
  ...overrides,
});

describe('OtherBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the bottom sheet container', () => {
      render(<OtherBottomSheet {...createProps()} />);

      expect(
        screen.getByTestId(OtherBottomSheetTestIds.BOTTOM_SHEET),
      ).toBeOnTheScreen();
    });

    it('renders the text input', () => {
      render(<OtherBottomSheet {...createProps()} />);

      expect(
        screen.getByTestId(OtherBottomSheetTestIds.TEXT_INPUT),
      ).toBeOnTheScreen();
    });

    it('renders the Done button', () => {
      render(<OtherBottomSheet {...createProps()} />);

      expect(
        screen.getByTestId(OtherBottomSheetTestIds.DONE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the close button in the header', () => {
      render(<OtherBottomSheet {...createProps()} />);

      expect(
        screen.getByTestId(
          `${OtherBottomSheetTestIds.BOTTOM_SHEET}-close-button`,
        ),
      ).toBeOnTheScreen();
    });

    it('displays the placeholder text in the text input', () => {
      render(<OtherBottomSheet {...createProps()} />);

      expect(
        screen.getByPlaceholderText(
          strings('onboarding_interest_questionnaire.other_placeholder'),
        ),
      ).toBeOnTheScreen();
    });

    it('renders the Done button label', () => {
      render(<OtherBottomSheet {...createProps()} />);

      expect(
        screen.getByText(strings('onboarding_interest_questionnaire.done')),
      ).toBeOnTheScreen();
    });
  });

  describe('initialValue', () => {
    it('starts with an empty text input when no initialValue is provided', () => {
      render(<OtherBottomSheet {...createProps()} />);

      const input = screen.getByTestId(OtherBottomSheetTestIds.TEXT_INPUT);
      expect(input.props.value).toBe('');
    });

    it('pre-populates the text input with the provided initialValue', () => {
      render(
        <OtherBottomSheet {...createProps({ initialValue: 'DeFi trading' })} />,
      );

      const input = screen.getByTestId(OtherBottomSheetTestIds.TEXT_INPUT);
      expect(input.props.value).toBe('DeFi trading');
    });
  });

  describe('text input interaction', () => {
    it('updates the text input as the user types', () => {
      render(<OtherBottomSheet {...createProps()} />);

      fireEvent.changeText(
        screen.getByTestId(OtherBottomSheetTestIds.TEXT_INPUT),
        'New input text',
      );

      expect(
        screen.getByTestId(OtherBottomSheetTestIds.TEXT_INPUT).props.value,
      ).toBe('New input text');
    });

    it('replaces the initialValue when the user types', () => {
      render(
        <OtherBottomSheet {...createProps({ initialValue: 'Old value' })} />,
      );

      fireEvent.changeText(
        screen.getByTestId(OtherBottomSheetTestIds.TEXT_INPUT),
        'Updated value',
      );

      expect(
        screen.getByTestId(OtherBottomSheetTestIds.TEXT_INPUT).props.value,
      ).toBe('Updated value');
    });
  });

  describe('close button', () => {
    it('calls onClose when the close button is pressed', () => {
      const onClose = jest.fn();
      render(<OtherBottomSheet {...createProps({ onClose })} />);

      fireEvent.press(
        screen.getByTestId(
          `${OtherBottomSheetTestIds.BOTTOM_SHEET}-close-button`,
        ),
      );

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onDone when the close button is pressed', () => {
      const onDone = jest.fn();
      render(<OtherBottomSheet {...createProps({ onDone })} />);

      fireEvent.press(
        screen.getByTestId(
          `${OtherBottomSheetTestIds.BOTTOM_SHEET}-close-button`,
        ),
      );

      expect(onDone).not.toHaveBeenCalled();
    });
  });

  describe('Done button', () => {
    it('calls onDone with the entered text when Done is pressed', () => {
      const onDone = jest.fn();
      render(<OtherBottomSheet {...createProps({ onDone })} />);

      fireEvent.changeText(
        screen.getByTestId(OtherBottomSheetTestIds.TEXT_INPUT),
        'DeFi trading',
      );
      fireEvent.press(screen.getByTestId(OtherBottomSheetTestIds.DONE_BUTTON));

      expect(onDone).toHaveBeenCalledWith('DeFi trading');
    });

    it('calls onDone with trimmed text when input has leading and trailing whitespace', () => {
      const onDone = jest.fn();
      render(<OtherBottomSheet {...createProps({ onDone })} />);

      fireEvent.changeText(
        screen.getByTestId(OtherBottomSheetTestIds.TEXT_INPUT),
        '  DeFi trading  ',
      );
      fireEvent.press(screen.getByTestId(OtherBottomSheetTestIds.DONE_BUTTON));

      expect(onDone).toHaveBeenCalledWith('DeFi trading');
    });

    it('calls onDone with an empty string when the input contains only whitespace', () => {
      const onDone = jest.fn();
      render(<OtherBottomSheet {...createProps({ onDone })} />);

      fireEvent.changeText(
        screen.getByTestId(OtherBottomSheetTestIds.TEXT_INPUT),
        '   ',
      );
      fireEvent.press(screen.getByTestId(OtherBottomSheetTestIds.DONE_BUTTON));

      expect(onDone).toHaveBeenCalledWith('');
    });

    it('calls onDone with an empty string when no text has been entered', () => {
      const onDone = jest.fn();
      render(<OtherBottomSheet {...createProps({ onDone })} />);

      fireEvent.press(screen.getByTestId(OtherBottomSheetTestIds.DONE_BUTTON));

      expect(onDone).toHaveBeenCalledWith('');
    });

    it('calls onDone with the trimmed initialValue when Done is pressed without changes', () => {
      const onDone = jest.fn();
      render(
        <OtherBottomSheet
          {...createProps({ initialValue: 'trading', onDone })}
        />,
      );

      fireEvent.press(screen.getByTestId(OtherBottomSheetTestIds.DONE_BUTTON));

      expect(onDone).toHaveBeenCalledWith('trading');
    });

    it('does not call onClose when Done is pressed', () => {
      const onClose = jest.fn();
      render(<OtherBottomSheet {...createProps({ onClose })} />);

      fireEvent.changeText(
        screen.getByTestId(OtherBottomSheetTestIds.TEXT_INPUT),
        'some text',
      );
      fireEvent.press(screen.getByTestId(OtherBottomSheetTestIds.DONE_BUTTON));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('platform keyboard handling', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: originalPlatform,
      });
    });

    it('offsets the entire sheet by keyboard height on Android', () => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: 'android',
      });

      render(<OtherBottomSheet {...createProps()} />);

      expect(
        screen.getByTestId(OtherBottomSheetTestIds.KEYBOARD_OFFSET_CONTAINER),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(OtherBottomSheetTestIds.BOTTOM_SHEET).props
          .accessibilityState,
      ).toEqual({ selected: false });
      expect(
        screen.getByTestId(OtherBottomSheetTestIds.DONE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('offsets the entire sheet by keyboard height on iOS', () => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        value: 'ios',
      });

      render(<OtherBottomSheet {...createProps()} />);

      expect(
        screen.queryByTestId(OtherBottomSheetTestIds.KEYBOARD_OFFSET_CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(OtherBottomSheetTestIds.BOTTOM_SHEET).props
          .accessibilityState,
      ).toEqual({ selected: true });
      expect(
        screen.getByTestId(OtherBottomSheetTestIds.DONE_BUTTON),
      ).toBeOnTheScreen();
    });
  });
});
