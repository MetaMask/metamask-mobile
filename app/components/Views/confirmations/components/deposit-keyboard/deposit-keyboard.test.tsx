import React, { useState } from 'react';
import {
  Dimensions,
  Keyboard,
  type KeyboardEvent,
  LayoutAnimation,
  Pressable,
  TextInput,
} from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { GlassView } from 'expo-glass-effect';
import {
  DEPOSIT_KEYBOARD_FRAME_TEST_ID,
  DEPOSIT_NATIVE_INPUT_TEST_ID,
  DepositKeyboard,
  DepositKeyboardProps,
  KEYBOARD_LAYOUT_ANIMATION,
  configureKeyboardLayoutAnimation,
  getKeyboardOverlap,
  getNativeKeypadValue,
} from './deposit-keyboard';
import { merge, noop } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { KeypadTestIds } from '../../../../Base/Keypad/Keypad.testIds';

let mockIsGlassEnabled = false;
let mockNetworkTier: string | null = null;
let mockHardwareTier: string | null = 'HIGH';

jest.mock('../../../../../component-library/hooks/useLiquidGlass', () => {
  const actual = jest.requireActual(
    '../../../../../component-library/hooks/useLiquidGlass',
  );
  return {
    ...actual,
    useLiquidGlass: () => ({
      ...actual.useLiquidGlass(),
      isGlassEnabled: mockIsGlassEnabled,
    }),
  };
});

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockNetworkTier,
}));

jest.mock('../../../../../util/deviceCapability', () => {
  const actual = jest.requireActual('../../../../../util/deviceCapability');
  return {
    ...actual,
    getHardwareTier: () => mockHardwareTier,
  };
});

function ContinueTransitionHarness() {
  const [hasInput, setHasInput] = useState(false);

  return (
    <>
      <DepositKeyboard
        hasInput={hasInput}
        onChange={noop}
        onDonePress={noop}
        onPercentagePress={noop}
        value={hasInput ? '1' : '0'}
      />
      <Pressable testID="toggle-has-input" onPress={() => setHasInput(true)} />
    </>
  );
}

function render(props: Partial<DepositKeyboardProps> = {}) {
  return renderWithProvider(
    <DepositKeyboard
      onChange={noop}
      onDonePress={noop}
      onPercentagePress={noop}
      value="0"
      {...props}
    />,
    {
      state: merge({}, otherControllersMock),
    },
  );
}

describe('DepositKeyboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsGlassEnabled = false;
    mockNetworkTier = null;
    mockHardwareTier = 'HIGH';
  });

  it('calls onChange when digit pressed', () => {
    const onChangeMock = jest.fn();

    const { getByText } = render({ onChange: onChangeMock });

    fireEvent.press(getByText('1'));

    expect(onChangeMock).toHaveBeenCalledWith('1');
  });

  it('edits from the amount as displayed when the value carries full precision', () => {
    // Max stores the exact balance, so editing the raw value would make the
    // user backspace away hidden decimals before the displayed amount moved.
    const onChangeMock = jest.fn();

    const { getByTestId } = render({
      onChange: onChangeMock,
      value: '50.389',
    });

    fireEvent.press(getByTestId(KeypadTestIds.DELETE_BUTTON));

    expect(onChangeMock).toHaveBeenCalledWith('50.3');
  });

  it('drops the hidden decimals when a digit is rejected at the decimal cap', () => {
    // The digit is still refused, since the displayed amount is already at
    // two decimals, but the value it reports back no longer carries the
    // precision the user cannot see.
    const onChangeMock = jest.fn();

    const { getByText } = render({ onChange: onChangeMock, value: '50.3891' });

    fireEvent.press(getByText('7'));

    expect(onChangeMock).toHaveBeenCalledWith('50.38');
  });

  it('hides done button if input is empty', () => {
    const { queryByTestId } = render();
    expect(queryByTestId('deposit-keyboard-done-button')).toBeNull();
  });

  it('crossfades the percentage bar into the continue button', () => {
    const configureNext = jest
      .spyOn(LayoutAnimation, 'configureNext')
      .mockImplementation();

    const { getByTestId } = renderWithProvider(<ContinueTransitionHarness />, {
      state: merge({}, otherControllersMock),
    });

    fireEvent.press(getByTestId('toggle-has-input'));

    expect(configureNext).toHaveBeenCalledWith(KEYBOARD_LAYOUT_ANIMATION);
    expect(getByTestId('deposit-keyboard-done-button')).toBeDefined();
    configureNext.mockRestore();
  });

  it('shows done button if hasInput set', () => {
    const { getByTestId } = render({
      hasInput: true,
      value: '1',
    });

    expect(getByTestId('deposit-keyboard-done-button')).toBeDefined();
  });

  it('calls onDone when done button pressed', () => {
    const onDonePressMock = jest.fn();

    const { getByTestId } = render({
      onDonePress: onDonePressMock,
      hasInput: true,
      value: '1',
    });

    fireEvent.press(getByTestId('deposit-keyboard-done-button'));

    expect(onDonePressMock).toHaveBeenCalled();
  });

  it('calls onPercentagePress when percentage button pressed', () => {
    const onPercentagePressMock = jest.fn();

    const { getByTestId } = render({
      onPercentagePress: onPercentagePressMock,
    });

    fireEvent.press(getByTestId('deposit-keyboard-percentage-50'));

    expect(onPercentagePressMock).toHaveBeenCalledWith(50);
  });

  it('claims a percentage press so the bar does not drag with the keyboard', () => {
    const { getByTestId } = render();
    let node = getByTestId('deposit-keyboard-percentage-50').parent;

    while (node && node.props.disallowInterruption !== true) {
      node = node.parent;
    }

    expect(node?.props.disallowInterruption).toBe(true);
  });

  it('widens the pressed percentage and hides the dividers beside it', () => {
    const { getByTestId } = render();
    const highlight = getByTestId('deposit-keyboard-percentage-highlight-50');
    const neighbor = getByTestId('deposit-keyboard-percentage-highlight-25');

    fireEvent(getByTestId('deposit-keyboard-percentage-50'), 'pressIn');

    expect(highlight).toHaveStyle({ marginHorizontal: -6 });
    expect(neighbor).not.toHaveStyle({ marginHorizontal: -6 });
    expect(
      getByTestId('deposit-keyboard-percentage-divider-25'),
    ).not.toHaveStyle({
      opacity: 0,
    });
    expect(getByTestId('deposit-keyboard-percentage-divider-50')).toHaveStyle({
      opacity: 0,
    });
    expect(getByTestId('deposit-keyboard-percentage-divider-90')).toHaveStyle({
      opacity: 0,
    });
  });

  it('keeps the outer gap on the first and last percentages', () => {
    const { getByTestId } = render();
    const first = getByTestId('deposit-keyboard-percentage-highlight-10');
    const last = getByTestId('deposit-keyboard-percentage-highlight-90');

    fireEvent(getByTestId('deposit-keyboard-percentage-10'), 'pressIn');

    expect(first).toHaveStyle({ marginRight: -6 });
    expect(first).not.toHaveStyle({ marginLeft: -6 });

    fireEvent(getByTestId('deposit-keyboard-percentage-10'), 'pressOut');
    fireEvent(getByTestId('deposit-keyboard-percentage-90'), 'pressIn');

    expect(last).toHaveStyle({ marginLeft: -6 });
    expect(last).not.toHaveStyle({ marginRight: -6 });
  });

  it('returns the pressed percentage to its resting width', () => {
    const { getByTestId } = render();
    const percentage = getByTestId('deposit-keyboard-percentage-50');

    fireEvent(percentage, 'pressIn');
    fireEvent(percentage, 'pressOut');

    expect(
      getByTestId('deposit-keyboard-percentage-highlight-50'),
    ).not.toHaveStyle({ marginHorizontal: -6 });
    expect(
      getByTestId('deposit-keyboard-percentage-divider-50'),
    ).not.toHaveStyle({
      opacity: 0,
    });
    expect(
      getByTestId('deposit-keyboard-percentage-divider-90'),
    ).not.toHaveStyle({
      opacity: 0,
    });
  });

  it('disables the done button when isDoneDisabled is set', () => {
    const onDonePressMock = jest.fn();

    const { getByTestId } = render({
      hasInput: true,
      isDoneDisabled: true,
      onDonePress: onDonePressMock,
      value: '1',
    });

    fireEvent.press(getByTestId('deposit-keyboard-done-button'));

    expect(onDonePressMock).not.toHaveBeenCalled();
  });

  it('renders doneLabel if specified', async () => {
    const { getByText } = render({
      doneLabel: 'Test Button',
      hasInput: true,
    });

    expect(getByText('Test Button')).toBeDefined();
  });

  it('renders max button if hasMax', () => {
    const { getByText } = render({
      hasMax: true,
    });

    expect(getByText('Max')).toBeDefined();
  });

  it('renders 90% button if hasMax is false', () => {
    const { getByText } = render({
      hasMax: false,
    });

    expect(getByText('90%')).toBeDefined();
  });

  it('draws the percentage bar on one glass surface when the device can show it', () => {
    mockIsGlassEnabled = true;

    const { getAllByText, UNSAFE_queryAllByType } = render();

    expect(getAllByText('10%')).toHaveLength(1);
    expect(UNSAFE_queryAllByType(GlassView)).toHaveLength(1);
  });

  it('keeps percentage buttons opaque when the device is offline', () => {
    mockIsGlassEnabled = true;
    mockNetworkTier = 'NONE';

    const { UNSAFE_queryAllByType } = render();

    expect(UNSAFE_queryAllByType(GlassView)).toHaveLength(0);
  });

  it('keeps percentage buttons opaque on low-end hardware', () => {
    mockIsGlassEnabled = true;
    mockNetworkTier = 'WIFI';
    mockHardwareTier = 'LOW';

    const { UNSAFE_queryAllByType } = render();

    expect(UNSAFE_queryAllByType(GlassView)).toHaveLength(0);
  });

  it('hides percentage buttons when hidePercentageButtons is true', () => {
    const { queryByText } = render({
      hidePercentageButtons: true,
    });

    expect(queryByText('10%')).toBeNull();
    expect(queryByText('25%')).toBeNull();
    expect(queryByText('50%')).toBeNull();
    expect(queryByText('90%')).toBeNull();
  });
});

describe('getKeyboardOverlap', () => {
  it('returns the keyboard height still covering the window', () => {
    const event = showEvent(280, 250);
    event.endCoordinates.screenY = 520;

    const overlap = getKeyboardOverlap(event, 800);

    expect(overlap).toBe(280);
  });

  it('returns 0 when the keyboard is below the window', () => {
    const overlap = getKeyboardOverlap(
      {
        ...showEvent(0, 250),
        endCoordinates: {
          height: 300,
          screenX: 0,
          screenY: 900,
          width: 390,
        },
      },
      800,
    );

    expect(overlap).toBe(0);
  });
});

describe('configureKeyboardLayoutAnimation', () => {
  it('uses the keyboard event duration and curve', () => {
    const configureNext = jest
      .spyOn(LayoutAnimation, 'configureNext')
      .mockImplementation();

    configureKeyboardLayoutAnimation(showEvent(200, 320));

    expect(configureNext).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 320 }),
    );
    configureNext.mockRestore();
  });

  it('skips layout animation while a drag reports no duration', () => {
    const configureNext = jest
      .spyOn(LayoutAnimation, 'configureNext')
      .mockImplementation();

    configureKeyboardLayoutAnimation(showEvent(80, 0));

    expect(configureNext).not.toHaveBeenCalled();
    configureNext.mockRestore();
  });
});

describe('getNativeKeypadValue', () => {
  it('strips a leading zero', () => {
    const value = getNativeKeypadValue('05', '.');

    expect(value).toBe('5');
  });

  it('prefixes a leading separator with zero', () => {
    const value = getNativeKeypadValue('.5', '.');

    expect(value).toBe('0.5');
  });

  it('keeps at most two decimal digits', () => {
    const value = getNativeKeypadValue('50.387', '.');

    expect(value).toBe('50.38');
  });

  it('uses the currency decimal separator', () => {
    const value = getNativeKeypadValue('1.25', ',');

    expect(value).toBe('1,25');
  });
});

describe('DepositKeyboard native keyboard', () => {
  it('renders the React Native decimal pad instead of the custom keypad', () => {
    const { getByTestId, queryByTestId } = render({
      useNativeKeyboard: true,
    });

    expect(getByTestId(DEPOSIT_NATIVE_INPUT_TEST_ID).props.keyboardType).toBe(
      'decimal-pad',
    );
    expect(queryByTestId(KeypadTestIds.KEY_1)).toBeNull();
  });

  it('reports the sanitized amount when the native text changes', () => {
    const onChange = jest.fn();

    const { getByTestId } = render({
      onChange,
      useNativeKeyboard: true,
      value: '50.38',
    });

    fireEvent.changeText(getByTestId(DEPOSIT_NATIVE_INPUT_TEST_ID), '50.387');

    expect(onChange).toHaveBeenCalledWith('50.38');
  });

  it('dismisses the React Native keyboard when done is pressed', () => {
    const onDonePress = jest.fn();
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation();

    const { getByTestId } = render({
      hasInput: true,
      onDonePress,
      useNativeKeyboard: true,
      value: '1',
    });

    fireEvent.press(getByTestId('deposit-keyboard-done-button'));

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(onDonePress).toHaveBeenCalledTimes(1);
    dismiss.mockRestore();
  });

  it('leaves the decimal pad closed after amount entry is dismissed', () => {
    const dismissedRef = { current: true };
    let hideListener: () => void = () => undefined;
    const focus = jest.spyOn(TextInput.prototype, 'focus').mockImplementation();

    jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation((eventName, callback) => {
        if (eventName === 'keyboardDidHide') {
          hideListener = callback as () => void;
        }
        return { remove: jest.fn() } as ReturnType<typeof Keyboard.addListener>;
      });

    render({
      nativeKeypadDismissedRef: dismissedRef,
      useNativeKeyboard: true,
    });

    act(() => {
      hideListener();
    });

    expect(focus).not.toHaveBeenCalled();
    focus.mockRestore();
    jest.mocked(Keyboard.addListener).mockRestore();
  });

  it('moves the frame with the keyboard show curve and duration', () => {
    const listeners = captureKeyboardListeners();
    const configureNext = jest
      .spyOn(LayoutAnimation, 'configureNext')
      .mockImplementation();

    const { getByTestId } = render({ useNativeKeyboard: true });

    act(() => {
      listeners.willShow?.(showEvent(320, 250));
    });

    expect(configureNext).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 250,
        update: expect.objectContaining({
          type: LayoutAnimation.Types.keyboard,
        }),
      }),
    );
    expect(getByTestId(DEPOSIT_KEYBOARD_FRAME_TEST_ID)).toHaveStyle({
      paddingBottom: 320 - 16,
    });
    configureNext.mockRestore();
    jest.mocked(Keyboard.addListener).mockRestore();
  });

  it('follows a keyboard drag on the frame it is reported', () => {
    const listeners = captureKeyboardListeners();
    const configureNext = jest
      .spyOn(LayoutAnimation, 'configureNext')
      .mockImplementation();

    const { getByTestId } = render({ useNativeKeyboard: true });

    act(() => {
      listeners.willChangeFrame?.(showEvent(120, 0));
    });

    expect(configureNext).not.toHaveBeenCalled();
    expect(getByTestId(DEPOSIT_KEYBOARD_FRAME_TEST_ID)).toHaveStyle({
      paddingBottom: 120 - 16,
    });
    configureNext.mockRestore();
    jest.mocked(Keyboard.addListener).mockRestore();
  });

  it('stops the cursor slide at willHide and closes amount entry at didHide', () => {
    const listeners = captureKeyboardListeners();
    const onNativeKeyboardWillHide = jest.fn();
    const onNativeKeyboardDidHide = jest.fn();
    const focus = jest.spyOn(TextInput.prototype, 'focus').mockImplementation();

    render({
      onNativeKeyboardDidHide,
      onNativeKeyboardWillHide,
      useNativeKeyboard: true,
    });

    act(() => {
      listeners.willShow?.(showEvent(300, 250));
      listeners.willHide?.(showEvent(0, 250));
      listeners.didHide?.();
    });

    expect(onNativeKeyboardWillHide).toHaveBeenCalledTimes(1);
    expect(onNativeKeyboardDidHide).toHaveBeenCalledTimes(1);
    expect(focus).not.toHaveBeenCalled();
    focus.mockRestore();
    jest.mocked(Keyboard.addListener).mockRestore();
  });
});

function showEvent(overlap: number, duration: number): KeyboardEvent {
  const windowHeight = Dimensions.get('window').height;

  return {
    duration,
    easing: 'keyboard',
    endCoordinates: {
      height: Math.max(overlap, 0),
      screenX: 0,
      screenY: windowHeight - overlap,
      width: 390,
    },
    startCoordinates: {
      height: 0,
      screenX: 0,
      screenY: windowHeight,
      width: 390,
    },
    isEventFromThisApp: true,
  };
}

function captureKeyboardListeners() {
  const listeners: {
    didHide?: () => void;
    willChangeFrame?: (event: KeyboardEvent) => void;
    willHide?: (event: KeyboardEvent) => void;
    willShow?: (event: KeyboardEvent) => void;
  } = {};

  jest
    .spyOn(Keyboard, 'addListener')
    .mockImplementation((eventName, callback) => {
      if (eventName === 'keyboardWillShow') {
        listeners.willShow = callback as (event: KeyboardEvent) => void;
      }
      if (eventName === 'keyboardWillHide') {
        listeners.willHide = callback as (event: KeyboardEvent) => void;
      }
      if (eventName === 'keyboardWillChangeFrame') {
        listeners.willChangeFrame = callback as (event: KeyboardEvent) => void;
      }
      if (eventName === 'keyboardDidHide') {
        listeners.didHide = callback as () => void;
      }
      return { remove: jest.fn() } as ReturnType<typeof Keyboard.addListener>;
    });

  return listeners;
}
