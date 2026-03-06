import React from 'react';
import { Alert, BackHandler } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { ThemeContext, mockTheme } from '../../../util/theme';
import StorageWrapper from '../../../store/storage-wrapper';
import Device from '../../../util/device';
import { SEED_PHRASE_HINTS } from '../../../constants/storage';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../../util/device', () => ({
  isAndroid: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../util/metrics/TrackOnboarding/trackOnboarding', () =>
  jest.fn(
    (
      event: Record<string, unknown>,
      saveOnboardingEvent?: (e: Record<string, unknown>) => void,
    ) => {
      if (saveOnboardingEvent) {
        saveOnboardingEvent(event);
      }
    },
  ),
);

jest.mock('../../../core/Analytics/MetricsEventBuilder', () => ({
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(() => ({
      build: jest.fn().mockReturnValue({ event: 'mock-event' }),
    })),
  },
}));

jest.mock('../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    WALLET_SECURITY_RECOVERY_HINT_SAVED: 'WALLET_SECURITY_RECOVERY_HINT_SAVED',
  },
}));

jest.mock('../../UI/OnboardingProgress', () => {
  const { View, Text } = jest.requireActual('react-native');
  return ({ currentStep, steps }: { currentStep: number; steps: string[] }) => (
    <View testID="onboarding-progress">
      <Text>{`Step ${currentStep} of ${steps.length}`}</Text>
    </View>
  );
});

jest.mock('../OnboardingSuccess', () => ({
  OnboardingSuccessComponent: ({
    onDone,
    backedUpSRP,
  }: {
    onDone: () => void;
    backedUpSRP: boolean;
  }) => {
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return (
      <TouchableOpacity testID="onboarding-success-done" onPress={onDone}>
        <Text>{backedUpSRP ? 'backed-up' : 'not-backed-up'}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../UI/Confetti', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="confetti" />;
});

jest.mock('../../UI/HintModal', () => {
  const { View, TextInput, TouchableOpacity, Text } =
    jest.requireActual('react-native');
  return ({
    onConfirm,
    onCancel,
    modalVisible,
    onRequestClose,
    value,
    onChangeText,
  }: {
    onConfirm: () => void;
    onCancel: () => void;
    modalVisible: boolean;
    onRequestClose: () => void;
    value: string;
    onChangeText: (text: string) => void;
  }) => (
    <View testID="hint-modal" accessibilityState={{ expanded: modalVisible }}>
      <TextInput
        testID="hint-input"
        value={value}
        onChangeText={onChangeText}
      />
      <TouchableOpacity testID="hint-confirm" onPress={onConfirm}>
        <Text>Save</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="hint-cancel" onPress={onCancel}>
        <Text>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="hint-request-close" onPress={onRequestClose}>
        <Text>Close</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../AndroidBackHandler', () => {
  const { View } = jest.requireActual('react-native');
  return ({ customBackPress }: { customBackPress: () => void }) => (
    <View testID="android-back-handler" onTouchEnd={customBackPress} />
  );
});

const mockSetOptions = jest.fn();
const mockGetTransparentOnboardingNavbarOptions = jest
  .fn()
  .mockReturnValue({ headerShown: false });

jest.mock('../../UI/Navbar', () => ({
  getTransparentOnboardingNavbarOptions: (...args: unknown[]) =>
    mockGetTransparentOnboardingNavbarOptions(...args),
}));

const mockStore = configureMockStore();
const store = mockStore({});

const themeValue = {
  colors: mockTheme.colors,
  themeAppearance: 'light',
};

const createProps = (overrides = {}) => ({
  navigation: {
    setOptions: mockSetOptions,
    navigate: jest.fn(),
    reset: jest.fn(),
    pop: jest.fn(),
  },
  route: {
    params: {
      steps: ['step1', 'step2', 'step3'],
      words: ['apple', 'banana', 'cherry'],
    },
  },
  saveOnboardingEvent: jest.fn(),
  ...overrides,
});

const renderComponent = (
  props = createProps(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contextValue: any = themeValue,
) => {
  const ManualBackupStep3 = jest.requireActual('./index').default;
  return render(
    <Provider store={store}>
      <ThemeContext.Provider value={contextValue}>
        <ManualBackupStep3 {...props} />
      </ThemeContext.Provider>
    </Provider>,
  );
};

describe('ManualBackupStep3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.clearActions();
    (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
    (StorageWrapper.setItem as jest.Mock).mockResolvedValue(undefined);
    (Device.isAndroid as jest.Mock).mockReturnValue(false);
  });

  describe('rendering', () => {
    it('renders Confetti and OnboardingSuccessComponent', async () => {
      const { getByTestId } = renderComponent();

      await waitFor(() => {
        expect(getByTestId('confetti')).toBeTruthy();
        expect(getByTestId('onboarding-success-done')).toBeTruthy();
      });
    });

    it('renders OnboardingProgress when steps are provided', async () => {
      const { getByTestId, getByText } = renderComponent();

      await waitFor(() => {
        expect(getByTestId('onboarding-progress')).toBeTruthy();
        expect(getByText('Step 4 of 3')).toBeTruthy();
      });
    });

    it('does not render OnboardingProgress when steps are not provided', async () => {
      const props = createProps({
        route: { params: {} },
      });
      const { queryByTestId } = renderComponent(props);

      await waitFor(() => {
        expect(queryByTestId('onboarding-progress')).toBeNull();
      });
    });

    it('renders AndroidBackHandler on Android', async () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(true);
      const { getByTestId } = renderComponent();

      await waitFor(() => {
        expect(getByTestId('android-back-handler')).toBeTruthy();
      });
    });

    it('does not render AndroidBackHandler on non-Android', async () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(false);
      const { queryByTestId } = renderComponent();

      await waitFor(() => {
        expect(queryByTestId('android-back-handler')).toBeNull();
      });
    });

    it('renders HintModal', async () => {
      const { getByTestId } = renderComponent();

      await waitFor(() => {
        expect(getByTestId('hint-modal')).toBeTruthy();
      });
    });

    it('passes backedUpSRP=true to OnboardingSuccessComponent', async () => {
      const { getByText } = renderComponent();

      await waitFor(() => {
        expect(getByText('backed-up')).toBeTruthy();
      });
    });
  });

  describe('componentDidMount', () => {
    it('sets navigation options on mount with context colors', async () => {
      renderComponent();

      await waitFor(() => {
        expect(mockGetTransparentOnboardingNavbarOptions).toHaveBeenCalledWith(
          mockTheme.colors,
        );
        expect(mockSetOptions).toHaveBeenCalledWith({ headerShown: false });
      });
    });

    it('falls back to mockTheme.colors when context has no colors', async () => {
      renderComponent(createProps(), {});

      await waitFor(() => {
        expect(mockGetTransparentOnboardingNavbarOptions).toHaveBeenCalledWith(
          mockTheme.colors,
        );
      });
    });

    it('registers BackHandler on mount', async () => {
      const addSpy = jest.spyOn(BackHandler, 'addEventListener');
      renderComponent();

      await waitFor(() => {
        expect(addSpy).toHaveBeenCalledWith(
          'hardwareBackPress',
          expect.any(Function),
        );
      });

      addSpy.mockRestore();
    });

    it('loads existing hint from storage on mount', async () => {
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ manualBackup: 'my saved hint' }),
      );

      const { getByTestId } = renderComponent();

      await waitFor(() => {
        expect(getByTestId('hint-input').props.value).toBe('my saved hint');
      });
    });

    it('handles null storage value gracefully', async () => {
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(null);
      const { getByTestId } = renderComponent();

      await waitFor(() => {
        expect(StorageWrapper.getItem).toHaveBeenCalledWith(SEED_PHRASE_HINTS);
      });

      expect(getByTestId('hint-input').props.value).toBeUndefined();
    });

    it('handles storage with no manualBackup key', async () => {
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ otherKey: 'value' }),
      );
      const { getByTestId } = renderComponent();

      await waitFor(() => {
        expect(StorageWrapper.getItem).toHaveBeenCalledWith(SEED_PHRASE_HINTS);
      });

      expect(getByTestId('hint-input').props.value).toBeUndefined();
    });
  });

  describe('componentWillUnmount', () => {
    it('removes BackHandler listener on unmount', async () => {
      const removeSpy = jest.spyOn(BackHandler, 'removeEventListener');
      const { unmount } = renderComponent();

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      unmount();

      expect(removeSpy).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );

      removeSpy.mockRestore();
    });
  });

  describe('toggleHint', () => {
    it('toggles hint modal visibility via cancel button', async () => {
      const { getByTestId } = renderComponent();

      await waitFor(() => {
        expect(getByTestId('hint-modal')).toBeTruthy();
      });

      expect(getByTestId('hint-modal').props.accessibilityState.expanded).toBe(
        false,
      );

      fireEvent.press(getByTestId('hint-cancel'));

      await waitFor(() => {
        expect(
          getByTestId('hint-modal').props.accessibilityState.expanded,
        ).toBe(true);
      });

      fireEvent.press(getByTestId('hint-cancel'));

      await waitFor(() => {
        expect(
          getByTestId('hint-modal').props.accessibilityState.expanded,
        ).toBe(false);
      });
    });
  });

  describe('handleChangeText', () => {
    it('updates hint text when user types', async () => {
      const { getByTestId } = renderComponent();

      await waitFor(() => {
        expect(getByTestId('hint-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('hint-input'), 'new hint text');

      await waitFor(() => {
        expect(getByTestId('hint-input').props.value).toBe('new hint text');
      });
    });
  });

  describe('saveHint', () => {
    it('does nothing when hint text is empty', async () => {
      const { getByTestId } = renderComponent();

      await waitFor(() => {
        expect(getByTestId('hint-confirm')).toBeTruthy();
      });

      fireEvent.press(getByTestId('hint-confirm'));

      await waitFor(() => {
        expect(StorageWrapper.setItem).not.toHaveBeenCalled();
      });
    });

    it('shows alert when hint matches seed phrase', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByTestId } = renderComponent();

      await waitFor(() => {
        expect(getByTestId('hint-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('hint-input'), 'apple banana cherry');
      fireEvent.press(getByTestId('hint-confirm'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error!', expect.any(String));
        expect(StorageWrapper.setItem).not.toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });

    it('shows alert when hint matches seed phrase case-insensitively', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByTestId } = renderComponent();

      await waitFor(() => {
        expect(getByTestId('hint-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('hint-input'), 'APPLE BANANA CHERRY');
      fireEvent.press(getByTestId('hint-confirm'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error!', expect.any(String));
      });

      alertSpy.mockRestore();
    });

    it('saves hint to storage and tracks event for valid hint', async () => {
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ existingKey: 'value' }),
      );

      const props = createProps();
      const { getByTestId } = renderComponent(props);

      await waitFor(() => {
        expect(getByTestId('hint-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('hint-input'), 'my valid hint');
      fireEvent.press(getByTestId('hint-confirm'));

      await waitFor(() => {
        expect(StorageWrapper.setItem).toHaveBeenCalledWith(
          SEED_PHRASE_HINTS,
          JSON.stringify({
            existingKey: 'value',
            manualBackup: 'my valid hint',
          }),
        );
      });

      expect(MetricsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.WALLET_SECURITY_RECOVERY_HINT_SAVED,
      );
      expect(trackOnboarding).toHaveBeenCalledWith(
        { event: 'mock-event' },
        expect.any(Function),
      );

      const actions = store.getActions();
      expect(actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'SAVE_EVENT' }),
        ]),
      );
    });

    it('toggles hint modal closed after successful save', async () => {
      (StorageWrapper.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({}),
      );

      const { getByTestId } = renderComponent();

      await waitFor(() => {
        expect(getByTestId('hint-input')).toBeTruthy();
      });

      fireEvent.press(getByTestId('hint-cancel'));
      await waitFor(() => {
        expect(
          getByTestId('hint-modal').props.accessibilityState.expanded,
        ).toBe(true);
      });

      fireEvent.changeText(getByTestId('hint-input'), 'a valid hint');
      fireEvent.press(getByTestId('hint-confirm'));

      await waitFor(() => {
        expect(
          getByTestId('hint-modal').props.accessibilityState.expanded,
        ).toBe(false);
      });
    });
  });

  describe('isHintSeedPhrase', () => {
    it('returns false when words param is not provided', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');

      const props = createProps({
        route: { params: { steps: ['s1'] } },
      });
      const { getByTestId } = renderComponent(props);

      await waitFor(() => {
        expect(getByTestId('hint-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('hint-input'), 'any text here');
      fireEvent.press(getByTestId('hint-confirm'));

      await waitFor(() => {
        expect(alertSpy).not.toHaveBeenCalled();
        expect(StorageWrapper.setItem).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });
  });

  describe('done', () => {
    it('resets navigation to HomeNav', async () => {
      const props = createProps();
      const { getByTestId } = renderComponent(props);

      await waitFor(() => {
        expect(getByTestId('onboarding-success-done')).toBeTruthy();
      });

      fireEvent.press(getByTestId('onboarding-success-done'));

      await waitFor(() => {
        expect(props.navigation.reset).toHaveBeenCalledWith({
          routes: [{ name: 'HomeNav' }],
        });
      });
    });
  });

  describe('hardwareBackPress', () => {
    it('handler returns empty object (prevents default back)', async () => {
      let capturedHandler: (() => unknown) | undefined;
      const addSpy = jest
        .spyOn(BackHandler, 'addEventListener')
        .mockImplementation((_event, handler) => {
          capturedHandler = handler as () => unknown;
          return { remove: jest.fn() };
        });

      renderComponent();

      await waitFor(() => {
        expect(addSpy).toHaveBeenCalled();
      });

      expect(capturedHandler).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guaranteed by assertion above
      const result = capturedHandler!();
      expect(result).toEqual({});

      addSpy.mockRestore();
    });
  });
});
