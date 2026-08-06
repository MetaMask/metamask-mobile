import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import {
  CardProviderError,
  CardProviderErrorCode,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { SetCardPinSelectors } from './SetCardPin.testIds';

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));
const mockSetCardPin = jest.fn();
const mockLogout = jest.fn();

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
    reset: mockReset,
    goBack: jest.fn(),
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

jest.mock('../../components/Onboarding/OnboardingStep', () => {
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return ({
    title,
    formFields,
    actions,
    onBackPress,
  }: {
    title: string;
    formFields: React.ReactNode;
    actions: React.ReactNode;
    onBackPress?: () => void;
  }) => (
    <View>
      {onBackPress ? (
        <Pressable testID="onboarding-step-back" onPress={onBackPress}>
          <Text>Back</Text>
        </Pressable>
      ) : null}
      <Text>{title}</Text>
      {formFields}
      {actions}
    </View>
  );
});

jest.mock(
  '../../components/CardScreenshotDeterrent/CardScreenshotDeterrent',
  () => {
    const { View } = jest.requireActual('react-native');
    return () => <View testID="screenshot-deterrent" />;
  },
);

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text, TextInput, Pressable } =
    jest.requireActual('react-native');
  return {
    Box: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
    Text: ({ children, ...props }: { children?: React.ReactNode }) => (
      <Text {...props}>{children}</Text>
    ),
    TextVariant: { BodySm: 'BodySm', BodyMd: 'BodyMd', HeadingLg: 'HeadingLg' },
    TextField: ({
      onChangeText,
      value,
      inputProps,
      isDisabled,
    }: {
      onChangeText?: (text: string) => void;
      value?: string;
      inputProps?: { testID?: string };
      isDisabled?: boolean;
    }) => (
      <TextInput
        testID={inputProps?.testID}
        value={value}
        onChangeText={onChangeText}
        editable={!isDisabled}
      />
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

import SetCardPin from './SetCardPin';

describe('SetCardPin', () => {
  let appStateHandler: ((state: string) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetCardPin.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((event, handler) => {
        if (event === 'change') {
          appStateHandler = handler as (state: string) => void;
        }
        return { remove: jest.fn() } as never;
      });
  });

  it('blocks continue until a valid 4-digit PIN is entered', () => {
    const { getByTestId } = renderWithProvider(<SetCardPin />);
    const continueButton = getByTestId(SetCardPinSelectors.CONTINUE_BUTTON);

    expect(continueButton).toBeDisabled();

    fireEvent.changeText(getByTestId(SetCardPinSelectors.PIN_FIELD), '1337');
    expect(continueButton).toBeEnabled();
  });

  it('returns to set step with cleared fields on PIN mismatch', async () => {
    const { getByTestId } = renderWithProvider(<SetCardPin />);

    fireEvent.changeText(getByTestId(SetCardPinSelectors.PIN_FIELD), '1337');
    fireEvent.press(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON));

    await waitFor(() => {
      expect(
        getByTestId(SetCardPinSelectors.CONFIRM_PIN_FIELD),
      ).toBeOnTheScreen();
    });

    fireEvent.changeText(
      getByTestId(SetCardPinSelectors.CONFIRM_PIN_FIELD),
      '1338',
    );
    fireEvent.press(getByTestId(SetCardPinSelectors.SUBMIT_BUTTON));

    await waitFor(() => {
      expect(getByTestId(SetCardPinSelectors.PIN_FIELD)).toBeOnTheScreen();
      expect(getByTestId(SetCardPinSelectors.INLINE_ERROR)).toBeOnTheScreen();
    });
    expect(mockSetCardPin).not.toHaveBeenCalled();
  });

  it('returns to set step when confirm header back is pressed', async () => {
    const { getByTestId, queryByTestId } = renderWithProvider(<SetCardPin />);

    fireEvent.changeText(getByTestId(SetCardPinSelectors.PIN_FIELD), '1337');
    fireEvent.press(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON));

    await waitFor(() => {
      expect(
        getByTestId(SetCardPinSelectors.CONFIRM_PIN_FIELD),
      ).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId('onboarding-step-back'));

    await waitFor(() => {
      expect(getByTestId(SetCardPinSelectors.PIN_FIELD)).toBeOnTheScreen();
      expect(
        queryByTestId(SetCardPinSelectors.CONFIRM_PIN_FIELD),
      ).not.toBeOnTheScreen();
    });
  });

  it('submits matching PINs and shows success', async () => {
    const { getByTestId } = renderWithProvider(<SetCardPin />);

    fireEvent.changeText(getByTestId(SetCardPinSelectors.PIN_FIELD), '1337');
    fireEvent.press(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON));

    await waitFor(() => {
      expect(
        getByTestId(SetCardPinSelectors.CONFIRM_PIN_FIELD),
      ).toBeOnTheScreen();
    });

    fireEvent.changeText(
      getByTestId(SetCardPinSelectors.CONFIRM_PIN_FIELD),
      '1337',
    );
    fireEvent.press(getByTestId(SetCardPinSelectors.SUBMIT_BUTTON));

    await waitFor(() => {
      expect(mockSetCardPin).toHaveBeenCalledWith('card-1', '1337');
      expect(getByTestId(SetCardPinSelectors.SUCCESS_TITLE)).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId(SetCardPinSelectors.DONE_BUTTON));
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
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
    const { getByTestId } = renderWithProvider(<SetCardPin />);

    fireEvent.changeText(getByTestId(SetCardPinSelectors.PIN_FIELD), '1337');
    fireEvent.press(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON));
    await waitFor(() =>
      expect(
        getByTestId(SetCardPinSelectors.CONFIRM_PIN_FIELD),
      ).toBeOnTheScreen(),
    );
    fireEvent.changeText(
      getByTestId(SetCardPinSelectors.CONFIRM_PIN_FIELD),
      '1337',
    );
    fireEvent.press(getByTestId(SetCardPinSelectors.SUBMIT_BUTTON));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.AUTHENTICATION, {
        showAuthPrompt: true,
      });
    });
  });

  it('clears PIN state when the app backgrounds', async () => {
    const { getByTestId } = renderWithProvider(<SetCardPin />);
    fireEvent.changeText(getByTestId(SetCardPinSelectors.PIN_FIELD), '1337');
    expect(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON)).toBeEnabled();

    await act(async () => {
      appStateHandler?.('background');
    });

    await waitFor(() => {
      expect(getByTestId(SetCardPinSelectors.CONTINUE_BUTTON)).toBeDisabled();
    });
  });
});
