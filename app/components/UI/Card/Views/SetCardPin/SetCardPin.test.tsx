import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { SetCardPinSelectors } from './SetCardPin.testIds';
import { clearPinDraft, getPinDraft } from './pinDraftStore';
import { PIN_ERROR_RESET_DELAY_MS } from './constants';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        setCardPin: jest.fn(),
        logout: jest.fn(),
      },
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: jest.fn(),
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({ cardId: 'card-1' }),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock(
  '../../components/CardScreenshotDeterrent/CardScreenshotDeterrent',
  () => {
    const { View } = jest.requireActual('react-native');
    return () => <View testID="screenshot-deterrent" />;
  },
);

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = Object.assign((..._args: unknown[]) => ({}), {
    style: jest.fn(() => ({})),
  });
  return { useTailwind: () => tw };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
  };
});

jest.mock('../../hooks/useCardHeaderHandlers', () => ({
  useCardHeaderHandlers: () => ({ onBack: jest.fn() }),
}));

jest.mock('../../../../Base/Keypad', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Pressable, Text } = jest.requireActual('react-native');
  const KeysEnum = {
    Digit0: '0',
    Digit1: '1',
    Digit2: '2',
    Digit3: '3',
    Digit4: '4',
    Digit5: '5',
    Digit6: '6',
    Digit7: '7',
    Digit8: '8',
    Digit9: '9',
    Period: 'Period',
    Back: 'Back',
    Initial: 'Initial',
  };

  const MockKeypad = ({
    onChange,
  }: {
    onChange: (data: {
      value: string;
      valueAsNumber: number;
      pressedKey: string;
    }) => void;
  }) =>
    ReactActual.createElement(
      View,
      { testID: 'mock-keypad' },
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) =>
        ReactActual.createElement(
          Pressable,
          {
            key: digit,
            testID: `keypad-key-${digit}`,
            onPress: () =>
              onChange({
                value: digit,
                valueAsNumber: Number(digit),
                pressedKey: digit,
              }),
          },
          ReactActual.createElement(Text, null, digit),
        ),
      ),
      ReactActual.createElement(
        Pressable,
        {
          testID: 'keypad-delete-button',
          onPress: () =>
            onChange({
              value: '',
              valueAsNumber: 0,
              pressedKey: KeysEnum.Back,
            }),
        },
        ReactActual.createElement(Text, null, 'Del'),
      ),
    );

  return {
    __esModule: true,
    default: MockKeypad,
    Keys: KeysEnum,
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    Box: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
    Text: ({ children, ...props }: { children?: React.ReactNode }) => (
      <Text {...props}>{children}</Text>
    ),
    TextVariant: {
      BodySm: 'BodySm',
      BodyMd: 'BodyMd',
      HeadingLg: 'HeadingLg',
      HeadingMd: 'HeadingMd',
    },
    BoxFlexDirection: { Row: 'row' },
    BoxAlignItems: { Center: 'center' },
    BoxJustifyContent: { Center: 'center' },
    HeaderStandard: () => <View testID="header-standard" />,
    Button: ({
      children,
      onPress,
      testID,
      isDisabled,
      isLoading,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      isDisabled?: boolean;
      isLoading?: boolean;
    }) => (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={isDisabled || isLoading}
        accessibilityState={{ disabled: Boolean(isDisabled || isLoading) }}
      >
        <Text>{children}</Text>
      </Pressable>
    ),
    ButtonVariant: { Primary: 'Primary' },
    ButtonSize: { Lg: 'Lg' },
  };
});

import SetCardPin from './SetCardPin';

const enterPin = (pressKey: (testID: string) => void, digits: string) => {
  for (const digit of digits) {
    pressKey(`keypad-key-${digit}`);
  }
};

describe('SetCardPin', () => {
  let appStateHandler: ((state: string) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    clearPinDraft();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((event, handler) => {
        if (event === 'change') {
          appStateHandler = handler as (state: string) => void;
        }
        return { remove: jest.fn() } as never;
      });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('keeps continue disabled until four digits are entered', () => {
    const { getByTestId } = renderWithProvider(<SetCardPin />);
    expect(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON)).toBeDisabled();

    enterPin((id) => fireEvent.press(getByTestId(id)), '133');
    expect(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON)).toBeDisabled();

    fireEvent.press(getByTestId('keypad-key-7'));
    expect(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON)).toBeEnabled();
  });

  it('stores the PIN draft and navigates to confirm on continue', () => {
    const { getByTestId } = renderWithProvider(<SetCardPin />);
    enterPin((id) => fireEvent.press(getByTestId(id)), '1337');
    fireEvent.press(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON));

    expect(getPinDraft()).toBe('1337');
    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.CONFIRM_PIN, {
      cardId: 'card-1',
    });
  });

  it('shows repeating PIN error then resets after delay', async () => {
    const { getByTestId, queryByTestId } = renderWithProvider(<SetCardPin />);
    enterPin((id) => fireEvent.press(getByTestId(id)), '1111');
    fireEvent.press(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON));

    expect(getByTestId(SetCardPinSelectors.INLINE_ERROR)).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(PIN_ERROR_RESET_DELAY_MS);
    });

    await waitFor(() => {
      expect(queryByTestId(SetCardPinSelectors.INLINE_ERROR)).toBeNull();
      expect(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON)).toBeDisabled();
    });
  });

  it('clears PIN state when the app backgrounds', async () => {
    const { getByTestId } = renderWithProvider(<SetCardPin />);
    enterPin((id) => fireEvent.press(getByTestId(id)), '1337');
    expect(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON)).toBeEnabled();

    await act(async () => {
      appStateHandler?.('background');
    });

    expect(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON)).toBeDisabled();
    expect(getPinDraft()).toBeNull();
  });
});
