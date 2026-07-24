import React from 'react';
import {
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';

import { strings } from '../../../../../locales/i18n';
import AuthDebugging from './AuthDebugging';
import { AuthDebuggingSelectorsIDs } from './AuthDebugging.testIds';
import ClipboardManager from '../../../../core/ClipboardManager';
import Logger from '../../../../util/Logger';

const mockGoBack = jest.fn();

const mockIsSignedIn = jest.fn();
const mockGetSessionProfile = jest.fn();
const mockGetBearerToken = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AuthenticationController: {
        isSignedIn: () => mockIsSignedIn(),
        getSessionProfile: () => mockGetSessionProfile(),
        getBearerToken: () => mockGetBearerToken(),
      },
    },
  },
}));

jest.mock('../../../../core/ClipboardManager', () => ({
  __esModule: true,
  default: {
    setString: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const PROFILE_ID = 'profile-123';
const BEARER_TOKEN = 'jwt-token-abc';

describe('AuthDebugging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSignedIn.mockReturnValue(false);
    mockGetSessionProfile.mockResolvedValue({ profileId: PROFILE_ID });
    mockGetBearerToken.mockResolvedValue(BEARER_TOKEN);
  });

  it('renders container with header, description, and safe area edges', async () => {
    const { getByTestId, getByText } = render(<AuthDebugging />);

    await waitFor(() => {
      expect(
        getByText(strings('app_settings.auth_debugging.not_signed_in')),
      ).toBeOnTheScreen();
    });

    const container = getByTestId(AuthDebuggingSelectorsIDs.CONTAINER);
    expect(container).toBeOnTheScreen();
    expect(container.props.edges).toMatchObject({ bottom: 'additive' });
    expect(getByTestId(AuthDebuggingSelectorsIDs.HEADER)).toBeOnTheScreen();
    expect(
      getByText(strings('app_settings.auth_debugging.description')),
    ).toBeOnTheScreen();
  });

  it('calls navigation.goBack when header back button is pressed', async () => {
    const { getByTestId } = render(<AuthDebugging />);

    await waitFor(() => {
      expect(getByTestId(AuthDebuggingSelectorsIDs.BACK_BUTTON)).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId(AuthDebuggingSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('displays not signed in message when AuthenticationController reports unsigned session', async () => {
    mockIsSignedIn.mockReturnValue(false);

    const { getByText } = render(<AuthDebugging />);

    await waitFor(() => {
      expect(
        getByText(strings('app_settings.auth_debugging.not_signed_in')),
      ).toBeOnTheScreen();
    });

    expect(mockGetSessionProfile).not.toHaveBeenCalled();
    expect(mockGetBearerToken).not.toHaveBeenCalled();
  });

  it('displays profile ID and JWT when signed in', async () => {
    mockIsSignedIn.mockReturnValue(true);

    const { getByTestId } = render(<AuthDebugging />);

    await waitFor(() => {
      expect(getByTestId(AuthDebuggingSelectorsIDs.PROFILE_ID_VALUE)).toHaveTextContent(
        PROFILE_ID,
      );
    });

    expect(getByTestId(AuthDebuggingSelectorsIDs.JWT_VALUE)).toHaveTextContent(
      BEARER_TOKEN,
    );
    expect(getByTestId(AuthDebuggingSelectorsIDs.REFRESH_BUTTON)).toBeOnTheScreen();
  });

  it('copies profile ID to clipboard and shows copied confirmation', async () => {
    mockIsSignedIn.mockReturnValue(true);

    const { getByTestId, getByText } = render(<AuthDebugging />);

    await waitFor(() => {
      expect(getByTestId(AuthDebuggingSelectorsIDs.PROFILE_ID_COPY_BUTTON)).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId(AuthDebuggingSelectorsIDs.PROFILE_ID_COPY_BUTTON));

    await waitFor(() => {
      expect(ClipboardManager.setString).toHaveBeenCalledWith(PROFILE_ID);
    });
    expect(
      getByText(strings('app_settings.auth_debugging.copied')),
    ).toBeOnTheScreen();
  });

  it('copies JWT to clipboard when JWT copy button is pressed', async () => {
    mockIsSignedIn.mockReturnValue(true);

    const { getByTestId } = render(<AuthDebugging />);

    await waitFor(() => {
      expect(getByTestId(AuthDebuggingSelectorsIDs.JWT_COPY_BUTTON)).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId(AuthDebuggingSelectorsIDs.JWT_COPY_BUTTON));

    await waitFor(() => {
      expect(ClipboardManager.setString).toHaveBeenCalledWith(BEARER_TOKEN);
    });
  });

  it('disables copy buttons when values are unavailable', async () => {
    mockIsSignedIn.mockReturnValue(true);
    mockGetSessionProfile.mockResolvedValue({});
    mockGetBearerToken.mockResolvedValue(undefined);

    const { getByTestId } = render(<AuthDebugging />);

    await waitFor(() => {
      expect(getByTestId(AuthDebuggingSelectorsIDs.PROFILE_ID_VALUE)).toHaveTextContent(
        strings('app_settings.auth_debugging.not_available'),
      );
    });

    fireEvent.press(getByTestId(AuthDebuggingSelectorsIDs.PROFILE_ID_COPY_BUTTON));
    fireEvent.press(getByTestId(AuthDebuggingSelectorsIDs.JWT_COPY_BUTTON));

    expect(ClipboardManager.setString).not.toHaveBeenCalled();
  });

  it('re-fetches auth info when refresh button is pressed', async () => {
    mockIsSignedIn.mockReturnValue(true);

    const { getByTestId } = render(<AuthDebugging />);

    await waitFor(() => {
      expect(getByTestId(AuthDebuggingSelectorsIDs.REFRESH_BUTTON)).toBeOnTheScreen();
    });

    mockGetSessionProfile.mockClear();
    mockGetBearerToken.mockClear();

    fireEvent.press(getByTestId(AuthDebuggingSelectorsIDs.REFRESH_BUTTON));

    await waitFor(() => {
      expect(mockGetSessionProfile).toHaveBeenCalledTimes(1);
      expect(mockGetBearerToken).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error message and logs when loading auth info fails', async () => {
    const loadError = new Error('Failed to fetch token');
    mockIsSignedIn.mockReturnValue(true);
    mockGetBearerToken.mockRejectedValue(loadError);

    const { getByText } = render(<AuthDebugging />);

    await waitFor(() => {
      expect(getByText(loadError.message)).toBeOnTheScreen();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      loadError,
      'AuthDebugging: failed to load auth debug info',
    );
    expect(
      getByText(strings('app_settings.auth_debugging.refresh')),
    ).toBeOnTheScreen();
  });
});
