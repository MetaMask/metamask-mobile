// Mock Text component from component-library FIRST (before any imports that use it)
jest.mock('../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: {
      children: React.ReactNode;
      variant?: string;
      style?: unknown;
    }) => <Text {...props}>{props.children}</Text>,
    TextVariant: {
      HeadingLG: 'HeadingLG',
      BodyMD: 'BodyMD',
    },
    TextColor: {
      Default: 'Default',
      Inverse: 'Inverse',
      Alternative: 'Alternative',
      Muted: 'Muted',
      Primary: 'Primary',
      PrimaryAlternative: 'PrimaryAlternative',
      Success: 'Success',
      Error: 'Error',
      ErrorAlternative: 'ErrorAlternative',
      Warning: 'Warning',
      Info: 'Info',
    },
  };
});

import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import TurnOffRememberMeModal from './TurnOffRememberMeModal';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME } from '../../../constants/storage';

// Mock ReduxService
import ReduxService from '../../../core/redux/ReduxService';
import type { ReduxStore } from '../../../core/redux/types';

// Mock Authentication source file (exports: export const Authentication = ...)
jest.mock('../../../core/Authentication/Authentication', () => ({
  Authentication: {
    updateAuthPreference: jest.fn(),
  },
}));

// Mock Authentication index (exports default Authentication)
jest.mock('../../../core/Authentication', () => {
  const authSource = jest.requireMock(
    '../../../core/Authentication/Authentication',
  );
  return {
    __esModule: true,
    default: authSource.Authentication,
  };
});

// Mock Authentication from core index (used by component directly)
jest.mock('../../../core', () => {
  const authModule = jest.requireMock('../../../core/Authentication');
  return {
    Authentication: authModule.default,
  };
});

// Mock StorageWrapper
jest.mock('../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// Mock doesPasswordMatch
jest.mock('../../../util/password', () => ({
  doesPasswordMatch: jest.fn(),
}));

// Mock OutlinedTextField
jest.mock('react-native-material-textfield', () => {
  const ReactActual = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');
  return {
    OutlinedTextField: ReactActual.forwardRef(
      (
        {
          placeholder,
          value,
          onChangeText,
          editable,
          secureTextEntry,
          ...props
        }: {
          placeholder?: string;
          value?: string;
          onChangeText?: (text: string) => void;
          editable?: boolean;
          secureTextEntry?: boolean;
          [key: string]: unknown;
        },
        ref: unknown,
      ) => (
        <TextInput
          ref={ref as React.RefObject<typeof TextInput>}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          secureTextEntry={secureTextEntry}
          testID={
            placeholder ? `text-input-${placeholder}` : 'outlined-text-field'
          }
          {...props}
        />
      ),
    ),
  };
});

// Mock ReusableModal
const mockDismissModal = jest.fn();
jest.mock('../ReusableModal', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return ReactActual.forwardRef(
    (
      { children }: { children: React.ReactNode; isInteractable?: boolean },
      ref: React.Ref<{ dismissModal: () => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        dismissModal: mockDismissModal,
      }));
      return <RNView testID="reusable-modal">{children}</RNView>;
    },
  );
});

// Mock useTheme
jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: { default: '#0000ff' },
      border: { default: '#cccccc' },
      text: { muted: '#999999' },
    },
    themeAppearance: 'light',
  }),
}));

// Mock styles
jest.mock('./styles', () => ({
  createStyles: () => ({
    container: {},
    areYouSure: {},
    textStyle: {},
    input: {},
  }),
}));

// Mock Box from design-system-react-native
jest.mock('@metamask/design-system-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Box: View,
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxAlignItems: {
      Center: 'center',
    },
  };
});

// Mock strings/i18n
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

// Mock WarningExistingUserModal
jest.mock('../WarningExistingUserModal', () => {
  const { View: RNView, TouchableOpacity: RNTouchableOpacity } =
    jest.requireActual('react-native');
  return ({
    children,
    cancelText,
    cancelButtonDisabled,
    onCancelPress,
    onRequestClose,
    onConfirmPress,
    warningModalVisible,
  }: {
    children: React.ReactNode;
    cancelText: string;
    cancelButtonDisabled: boolean;
    onCancelPress: () => void;
    onRequestClose: () => void;
    onConfirmPress: () => void;
    warningModalVisible: boolean;
  }) => {
    if (!warningModalVisible) return null;
    return (
      <RNView testID="warning-existing-user-modal">
        <RNView testID="warning-modal-content">{children}</RNView>
        <RNTouchableOpacity
          testID="warning-modal-cancel-button"
          onPress={onCancelPress}
          disabled={cancelButtonDisabled}
        >
          <RNView>{cancelText}</RNView>
        </RNTouchableOpacity>
        <RNTouchableOpacity
          testID="warning-modal-close"
          onPress={onRequestClose}
        />
        <RNTouchableOpacity
          testID="warning-modal-confirm"
          onPress={onConfirmPress}
        />
      </RNView>
    );
  };
});

describe('TurnOffRememberMeModal', () => {
  let mockDoesPasswordMatch: jest.Mock;
  let mockGetItem: jest.Mock;
  let mockRemoveItem: jest.Mock;
  let mockUpdateAuthPreference: jest.Mock;

  const createMockReduxStore = (): ReduxStore =>
    ({
      dispatch: jest.fn(),
      getState: jest.fn(() => ({
        user: {
          existingUser: false,
        },
        security: {
          allowLoginWithRememberMe: true,
        },
        settings: {
          lockTime: -1,
        },
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: null, // Not in seedless flow
            },
          },
        },
      })),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
      [Symbol.observable]: jest.fn(),
    }) as unknown as ReduxStore;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ReduxService store
    const mockStore = createMockReduxStore();
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue(mockStore);

    // Get the mocked functions from the modules
    const passwordModule = jest.requireMock('../../../util/password');
    mockDoesPasswordMatch = passwordModule.doesPasswordMatch as jest.Mock;

    const storageModule = jest.requireMock('../../../store/storage-wrapper');
    mockGetItem = storageModule.default.getItem as jest.Mock;
    mockRemoveItem = storageModule.default.removeItem as jest.Mock;

    // Get Authentication mocks from the mocked module
    const authModule = jest.requireMock(
      '../../../core/Authentication/Authentication',
    );
    mockUpdateAuthPreference = authModule.Authentication
      .updateAuthPreference as jest.Mock;

    // Clear and reset mocks
    mockDismissModal.mockClear();
    mockUpdateAuthPreference.mockClear();

    // Set default mock implementations
    mockDoesPasswordMatch.mockResolvedValue({ valid: false });
    mockUpdateAuthPreference.mockResolvedValue(undefined);
    mockGetItem.mockResolvedValue(null);
    mockRemoveItem.mockResolvedValue(undefined);
  });

  const initialState = {
    security: {
      allowLoginWithRememberMe: true,
    },
  };

  it('renders correctly', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <TurnOffRememberMeModal />,
      {
        state: initialState,
      },
    );

    expect(getByTestId('reusable-modal')).toBeTruthy();
    expect(getByTestId('warning-existing-user-modal')).toBeTruthy();
    expect(getByText('turn_off_remember_me.title')).toBeTruthy();
  });

  it('disables button when password is invalid', async () => {
    mockDoesPasswordMatch.mockResolvedValue({ valid: false });

    const { getByTestId } = renderWithProvider(<TurnOffRememberMeModal />, {
      state: initialState,
    });

    const input = getByTestId('text-input-turn_off_remember_me.placeholder');
    const button = getByTestId('warning-modal-cancel-button');

    fireEvent.changeText(input, 'invalid');

    await waitFor(() => {
      expect(mockDoesPasswordMatch).toHaveBeenCalled();
      expect(button.props.disabled).toBe(true);
    });
  });

  it('enables button when password is valid', async () => {
    mockDoesPasswordMatch.mockResolvedValue({ valid: true });

    const { getByTestId } = renderWithProvider(<TurnOffRememberMeModal />, {
      state: initialState,
    });

    const input = getByTestId('text-input-turn_off_remember_me.placeholder');
    const button = getByTestId('warning-modal-cancel-button');

    fireEvent.changeText(input, 'ValidPassword123!');

    await waitFor(() => {
      expect(mockDoesPasswordMatch).toHaveBeenCalled();
      expect(button.props.disabled).toBe(false);
    });
  });

  it('restores previous auth type when disabling remember me', async () => {
    mockGetItem.mockResolvedValue(AUTHENTICATION_TYPE.BIOMETRIC);
    mockDoesPasswordMatch.mockResolvedValue({ valid: true });

    const { getByTestId } = renderWithProvider(<TurnOffRememberMeModal />, {
      state: initialState,
    });

    const input = getByTestId('text-input-turn_off_remember_me.placeholder');
    fireEvent.changeText(input, 'ValidPassword123!');

    await waitFor(() => {
      expect(mockDoesPasswordMatch).toHaveBeenCalled();
    });

    const button = getByTestId('warning-modal-cancel-button');

    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalledWith(
        PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
      );
      expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
        authType: AUTHENTICATION_TYPE.BIOMETRIC,
        password: 'ValidPassword123!',
      });
      expect(mockRemoveItem).toHaveBeenCalledWith(
        PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
      );
      expect(mockDismissModal).toHaveBeenCalled();
    });
  });

  it('falls back to PASSWORD when no previous auth type is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    mockDoesPasswordMatch.mockResolvedValue({ valid: true });

    const { getByTestId } = renderWithProvider(<TurnOffRememberMeModal />, {
      state: initialState,
    });

    const input = getByTestId('text-input-turn_off_remember_me.placeholder');
    fireEvent.changeText(input, 'ValidPassword123!');

    await waitFor(() => {
      expect(mockDoesPasswordMatch).toHaveBeenCalled();
    });

    const button = getByTestId('warning-modal-cancel-button');

    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalledWith({
        authType: AUTHENTICATION_TYPE.PASSWORD,
        password: 'ValidPassword123!',
      });
    });
  });

  it('shows loading indicator during password submission', async () => {
    let resolveUpdateAuthPreference: (() => void) | undefined;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdateAuthPreference = resolve;
    });
    mockUpdateAuthPreference.mockReturnValue(updatePromise);
    mockDoesPasswordMatch.mockResolvedValue({ valid: true });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <TurnOffRememberMeModal />,
      { state: initialState },
    );

    const input = getByTestId('text-input-turn_off_remember_me.placeholder');
    fireEvent.changeText(input, 'ValidPassword123!');

    await waitFor(() => {
      expect(mockDoesPasswordMatch).toHaveBeenCalled();
    });

    const button = getByTestId('warning-modal-cancel-button');
    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalled();
    });

    expect(
      queryByTestId('text-input-turn_off_remember_me.placeholder'),
    ).toBeNull();
    expect(button.props.disabled).toBe(true);

    if (resolveUpdateAuthPreference) {
      resolveUpdateAuthPreference();
    }
  });

  it('disables input and button during loading', async () => {
    let resolveUpdateAuthPreference: (() => void) | undefined;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdateAuthPreference = resolve;
    });
    mockUpdateAuthPreference.mockReturnValue(updatePromise);
    mockDoesPasswordMatch.mockResolvedValue({ valid: true });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <TurnOffRememberMeModal />,
      { state: initialState },
    );

    const input = getByTestId('text-input-turn_off_remember_me.placeholder');
    fireEvent.changeText(input, 'ValidPassword123!');

    await waitFor(() => {
      expect(mockDoesPasswordMatch).toHaveBeenCalled();
    });

    const button = getByTestId('warning-modal-cancel-button');
    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalled();
    });

    expect(
      queryByTestId('text-input-turn_off_remember_me.placeholder'),
    ).toBeNull();
    expect(button.props.disabled).toBe(true);

    if (resolveUpdateAuthPreference) {
      resolveUpdateAuthPreference();
    }
  });

  it('handles error during auth preference update', async () => {
    const error = new Error('Update failed');
    mockUpdateAuthPreference.mockRejectedValue(error);
    mockDoesPasswordMatch.mockResolvedValue({ valid: true });

    const { getByTestId } = renderWithProvider(<TurnOffRememberMeModal />, {
      state: initialState,
    });

    const input = getByTestId('text-input-turn_off_remember_me.placeholder');
    fireEvent.changeText(input, 'ValidPassword123!');

    await waitFor(() => {
      expect(mockDoesPasswordMatch).toHaveBeenCalled();
    });

    const button = getByTestId('warning-modal-cancel-button');
    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalled();
      expect(mockDismissModal).toHaveBeenCalled();
    });
  });

  it('prevents modal dismissal during loading', async () => {
    let resolveUpdateAuthPreference: (() => void) | undefined;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdateAuthPreference = resolve;
    });
    mockUpdateAuthPreference.mockReturnValue(updatePromise);
    mockDoesPasswordMatch.mockResolvedValue({ valid: true });

    const { getByTestId } = renderWithProvider(<TurnOffRememberMeModal />, {
      state: initialState,
    });

    const input = getByTestId('text-input-turn_off_remember_me.placeholder');
    fireEvent.changeText(input, 'ValidPassword123!');

    await waitFor(() => {
      expect(mockDoesPasswordMatch).toHaveBeenCalled();
    });

    const button = getByTestId('warning-modal-cancel-button');

    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalled();
    });

    expect(mockDismissModal).not.toHaveBeenCalled();

    // Resolve the promise
    if (resolveUpdateAuthPreference) {
      resolveUpdateAuthPreference();
      await waitFor(() => {
        expect(mockDismissModal).toHaveBeenCalled();
      });
    }
  });

  it('clears loading state after operation completes', async () => {
    mockDoesPasswordMatch.mockResolvedValue({ valid: true });

    const { getByTestId } = renderWithProvider(<TurnOffRememberMeModal />, {
      state: initialState,
    });

    const input = getByTestId('text-input-turn_off_remember_me.placeholder');
    fireEvent.changeText(input, 'ValidPassword123!');

    await waitFor(() => {
      expect(mockDoesPasswordMatch).toHaveBeenCalled();
    });

    const button = getByTestId('warning-modal-cancel-button');
    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => {
      expect(mockUpdateAuthPreference).toHaveBeenCalled();
      expect(mockDismissModal).toHaveBeenCalled();
    });
  });
});
