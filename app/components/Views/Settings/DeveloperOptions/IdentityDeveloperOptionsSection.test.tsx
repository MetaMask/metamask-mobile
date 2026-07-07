import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import IdentityDeveloperOptionsSection from './IdentityDeveloperOptionsSection';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AuthenticationController: {
        performSignOut: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockPerformSignOut = Engine.context.AuthenticationController
  .performSignOut as jest.Mock;
const mockLoggerError = Logger.error as jest.Mock;
const CLEAR_AUTH_SESSION_TEST_ID = 'identity-dev-clear-auth-session-button';

describe('IdentityDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Identity heading', () => {
    const { getByText } = renderWithProvider(
      <IdentityDeveloperOptionsSection />,
    );

    expect(getByText('Identity')).toBeDefined();
  });

  it('surfaces the current MM_DEV_API_ENV in the description', () => {
    const { getByText } = renderWithProvider(
      <IdentityDeveloperOptionsSection />,
    );

    expect(getByText(/Current MM_DEV_API_ENV: prod/)).toBeDefined();
  });

  it('calls performSignOut when the clear button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <IdentityDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(CLEAR_AUTH_SESSION_TEST_ID));

    expect(mockPerformSignOut).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('logs via Logger.error and does not propagate when performSignOut throws', () => {
    const failure = new Error('sign-out blew up');
    mockPerformSignOut.mockImplementationOnce(() => {
      throw failure;
    });

    const { getByTestId } = renderWithProvider(
      <IdentityDeveloperOptionsSection />,
    );

    expect(() =>
      fireEvent.press(getByTestId(CLEAR_AUTH_SESSION_TEST_ID)),
    ).not.toThrow();

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(
      failure,
      'IdentityDeveloperOptionsSection: clear auth session failed',
    );
  });

  it('wraps non-Error throws before passing them to Logger.error', () => {
    mockPerformSignOut.mockImplementationOnce(() => {
      throw 'boom';
    });

    const { getByTestId } = renderWithProvider(
      <IdentityDeveloperOptionsSection />,
    );

    fireEvent.press(getByTestId(CLEAR_AUTH_SESSION_TEST_ID));

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    const [loggedError, loggedContext] = mockLoggerError.mock.calls[0];
    expect(loggedError).toBeInstanceOf(Error);
    expect((loggedError as Error).message).toBe('boom');
    expect(loggedContext).toBe(
      'IdentityDeveloperOptionsSection: clear auth session failed',
    );
  });
});
