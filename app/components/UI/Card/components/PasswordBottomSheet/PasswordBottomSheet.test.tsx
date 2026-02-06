import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import PasswordBottomSheet from './PasswordBottomSheet';
import useAuthentication from '../../../../../core/Authentication/hooks/useAuthentication';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { CardHomeSelectors } from '../../Views/CardHome/CardHome.testIds';

// Mock hooks - must be hoisted before imports
const mockUseParams = jest.fn();
const mockGoBack = jest.fn();

// Mock deprecated Linking.removeEventListener to prevent warning from React Navigation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Linking as any).removeEventListener = jest.fn();

jest.mock('../../../../../core/Authentication/hooks/useAuthentication', () =>
  jest.fn(),
);

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      text: {
        muted: '#999999',
        default: '#000000',
        alternative: '#666666',
      },
      error: {
        default: '#FF0000',
      },
    },
  })),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
  createNavigationDetails: jest.fn((stackId, screenName) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (params?: any) => [stackId, { screen: screenName, params }],
  ),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

const renderWithProvider = (component: React.ComponentType) =>
  renderScreen(
    component,
    {
      name: 'PasswordBottomSheet',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );

describe('PasswordBottomSheet', () => {
  const mockReauthenticate = jest.fn();
  const mockOnSuccess = jest.fn();

  const setupComponent = () => {
    mockUseParams.mockReturnValue({
      onSuccess: mockOnSuccess,
    });

    return renderWithProvider(() => <PasswordBottomSheet />);
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    (useAuthentication as jest.Mock).mockReturnValue({
      reauthenticate: mockReauthenticate,
    });
  });

  afterEach(async () => {
    // Flush pending timers and state updates to avoid act() warnings
    await act(async () => {
      jest.runAllTimers();
    });
    jest.resetAllMocks();
  });

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = setupComponent();

    expect(toJSON()).toMatchSnapshot();
  });

  it('displays title and description text', () => {
    const { getByText } = setupComponent();

    expect(getByText('Enter password')).toBeTruthy();
    expect(
      getByText('Enter your wallet password to view card details.'),
    ).toBeTruthy();
  });

  it('displays password input field', () => {
    const { getByTestId } = setupComponent();

    const passwordInput = getByTestId(CardHomeSelectors.PASSWORD_INPUT);

    expect(passwordInput).toBeTruthy();
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('displays cancel and confirm buttons', () => {
    const { getByTestId } = setupComponent();

    expect(getByTestId(CardHomeSelectors.PASSWORD_CANCEL_BUTTON)).toBeTruthy();
    expect(getByTestId(CardHomeSelectors.PASSWORD_CONFIRM_BUTTON)).toBeTruthy();
  });

  it('displays error when submitting empty password', async () => {
    const { getByTestId, getByText } = setupComponent();

    const confirmButton = getByTestId(
      CardHomeSelectors.PASSWORD_CONFIRM_BUTTON,
    );

    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(getByText('Please enter your password')).toBeTruthy();
    });

    expect(mockReauthenticate).not.toHaveBeenCalled();
  });

  it('displays error when password is incorrect', async () => {
    mockReauthenticate.mockRejectedValueOnce(new Error('Invalid password'));

    const { getByTestId, getByText } = setupComponent();

    const passwordInput = getByTestId(CardHomeSelectors.PASSWORD_INPUT);
    const confirmButton = getByTestId(
      CardHomeSelectors.PASSWORD_CONFIRM_BUTTON,
    );

    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(getByText('Incorrect password. Please try again.')).toBeTruthy();
    });

    expect(mockReauthenticate).toHaveBeenCalledWith('wrongpassword');
  });

  it('calls reauthenticate with entered password on submit', async () => {
    mockReauthenticate.mockResolvedValueOnce({ password: 'correctpassword' });

    const { getByTestId } = setupComponent();

    const passwordInput = getByTestId(CardHomeSelectors.PASSWORD_INPUT);
    const confirmButton = getByTestId(
      CardHomeSelectors.PASSWORD_CONFIRM_BUTTON,
    );

    fireEvent.changeText(passwordInput, 'correctpassword');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockReauthenticate).toHaveBeenCalledWith('correctpassword');
    });
  });

  it('clears error when user types after error is displayed', async () => {
    const { getByTestId, getByText, queryByTestId } = setupComponent();

    const passwordInput = getByTestId(CardHomeSelectors.PASSWORD_INPUT);
    const confirmButton = getByTestId(
      CardHomeSelectors.PASSWORD_CONFIRM_BUTTON,
    );

    // Submit empty password to trigger error
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(getByText('Please enter your password')).toBeTruthy();
    });

    // Type in password input
    fireEvent.changeText(passwordInput, 'a');

    await waitFor(() => {
      expect(queryByTestId(CardHomeSelectors.PASSWORD_ERROR)).toBeNull();
    });
  });

  it('submits password on keyboard submit', async () => {
    mockReauthenticate.mockResolvedValueOnce({ password: 'mypassword' });

    const { getByTestId } = setupComponent();

    const passwordInput = getByTestId(CardHomeSelectors.PASSWORD_INPUT);

    fireEvent.changeText(passwordInput, 'mypassword');
    fireEvent(passwordInput, 'submitEditing');

    await waitFor(() => {
      expect(mockReauthenticate).toHaveBeenCalledWith('mypassword');
    });
  });

  it('trims whitespace from password before validation', async () => {
    const { getByTestId, getByText } = setupComponent();

    const passwordInput = getByTestId(CardHomeSelectors.PASSWORD_INPUT);
    const confirmButton = getByTestId(
      CardHomeSelectors.PASSWORD_CONFIRM_BUTTON,
    );

    // Enter only whitespace
    fireEvent.changeText(passwordInput, '   ');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(getByText('Please enter your password')).toBeTruthy();
    });

    expect(mockReauthenticate).not.toHaveBeenCalled();
  });

  it('disables input while loading', async () => {
    // Make reauthenticate hang to simulate loading state
    mockReauthenticate.mockImplementation(
      () =>
        new Promise((_resolve) => {
          // Never resolves - used to simulate loading state
        }),
    );

    const { getByTestId } = setupComponent();

    const passwordInput = getByTestId(CardHomeSelectors.PASSWORD_INPUT);
    const confirmButton = getByTestId(
      CardHomeSelectors.PASSWORD_CONFIRM_BUTTON,
    );

    fireEvent.changeText(passwordInput, 'password');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(getByTestId(CardHomeSelectors.PASSWORD_INPUT).props.editable).toBe(
        false,
      );
    });
  });
});
