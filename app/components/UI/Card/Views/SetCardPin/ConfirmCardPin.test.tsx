import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import {
  CardProviderError,
  CardProviderErrorCode,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { ToastContext } from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { SetCardPinSelectors } from './SetCardPin.testIds';
import { clearPinDraft, getPinDraft, setPinDraft } from './pinDraftStore';
import { PIN_ERROR_RESET_DELAY_MS } from './constants';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockShowToast = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));
const mockSetCardPin = jest.fn();
const mockLogout = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        setCardPin: (...args: unknown[]) => mockSetCardPin(...args),
        logout: (...args: unknown[]) => mockLogout(...args),
      },
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: mockReset,
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

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
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
  useCardHeaderHandlers: jest.fn((mode: string) =>
    mode === 'back' ? { onBack: jest.fn() } : {},
  ),
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
    HeaderStandard: ({ onBack }: { onBack?: () => void }) => (
      <Pressable testID="confirm-back" onPress={onBack}>
        <Text>Back</Text>
      </Pressable>
    ),
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

import ConfirmCardPin from './ConfirmCardPin';

const enterPin = (pressKey: (testID: string) => void, digits: string) => {
  for (const digit of digits) {
    pressKey(`keypad-key-${digit}`);
  }
};

const renderConfirmCardPin = () =>
  renderWithProvider(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      <ConfirmCardPin />
    </ToastContext.Provider>,
  );

describe('ConfirmCardPin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    clearPinDraft();
    setPinDraft('1337');
    mockSetCardPin.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('navigates back when draft PIN is missing', () => {
    clearPinDraft();
    renderConfirmCardPin();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows mismatch error then returns to set PIN', async () => {
    const { getByTestId } = renderConfirmCardPin();
    enterPin((id) => fireEvent.press(getByTestId(id)), '1338');
    fireEvent.press(getByTestId(SetCardPinSelectors.SUBMIT_BUTTON));

    expect(getByTestId(SetCardPinSelectors.INLINE_ERROR)).toBeOnTheScreen();
    expect(mockSetCardPin).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(PIN_ERROR_RESET_DELAY_MS);
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.SET_PIN, {
      cardId: 'card-1',
    });
  });

  it('submits matching PINs, shows success toast, and resets to Card Home', async () => {
    const { getByTestId } = renderConfirmCardPin();
    enterPin((id) => fireEvent.press(getByTestId(id)), '1337');
    fireEvent.press(getByTestId(SetCardPinSelectors.SUBMIT_BUTTON));

    await waitFor(() => {
      expect(mockSetCardPin).toHaveBeenCalledWith('card-1', '1337');
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: [{ label: strings('card.set_pin.success_title') }],
          descriptionOptions: {
            description: strings('card.set_pin.success_description'),
          },
          iconName: IconName.Confirmation,
          hasNoTimeout: false,
          closeButtonOptions: expect.objectContaining({
            iconName: IconName.Close,
          }),
        }),
      );
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    });
  });

  it('clears draft PIN when confirm header back is pressed', async () => {
    const { getByTestId } = renderConfirmCardPin();
    expect(getPinDraft()).toBe('1337');

    fireEvent.press(getByTestId('confirm-back'));

    expect(getPinDraft()).toBeNull();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('routes auth failures to CardAuthentication', async () => {
    mockSetCardPin.mockRejectedValue(
      new CardProviderError(
        CardProviderErrorCode.Forbidden,
        'Forbidden',
        403,
        'LIVENESS_MISMATCH',
      ),
    );
    const { getByTestId } = renderConfirmCardPin();
    enterPin((id) => fireEvent.press(getByTestId(id)), '1337');
    fireEvent.press(getByTestId(SetCardPinSelectors.SUBMIT_BUTTON));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.AUTHENTICATION, {
        showAuthPrompt: true,
      });
    });
  });

  it('ignores back while submit is pending', async () => {
    let resolveSetCardPin: (() => void) | undefined;
    mockSetCardPin.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSetCardPin = resolve;
        }),
    );
    const { getByTestId } = renderConfirmCardPin();
    enterPin((id) => fireEvent.press(getByTestId(id)), '1337');
    fireEvent.press(getByTestId(SetCardPinSelectors.SUBMIT_BUTTON));

    await waitFor(() => {
      expect(mockSetCardPin).toHaveBeenCalled();
    });

    fireEvent.press(getByTestId('confirm-back'));
    expect(mockGoBack).not.toHaveBeenCalled();

    await act(async () => {
      resolveSetCardPin?.();
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    });
  });
});
