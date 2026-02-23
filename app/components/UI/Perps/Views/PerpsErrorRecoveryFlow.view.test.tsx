/**
 * Error & Recovery Flow — use-case-driven view tests.
 *
 * User journey: a trader encounters connection issues, sees loading states,
 * retries failed connections, and encounters various error states before
 * eventually recovering.
 *
 * Components covered: PerpsLoadingSkeleton, PerpsConnectionErrorView,
 * PerpsErrorState
 */
import '../../../../../tests/component-view/mocks';
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import {
  renderPerpsView,
  renderPerpsComponent,
  renderPerpsComponentDisconnected,
} from '../../../../../tests/component-view/renderers/perpsViewRenderer';
import PerpsConnectionErrorView from '../components/PerpsConnectionErrorView/PerpsConnectionErrorView';
import PerpsErrorState, {
  PerpsErrorType,
} from '../components/PerpsErrorState/PerpsErrorState';
import PerpsLoadingSkeleton from '../components/PerpsLoadingSkeleton/PerpsLoadingSkeleton';

const mockOnRetry = jest.fn();

const ConnectionErrorDefault: React.FC = () => (
  <PerpsConnectionErrorView error="Connection failed" onRetry={mockOnRetry} />
);

const ConnectionErrorWithBack: React.FC = () => (
  <PerpsConnectionErrorView
    error="Connection failed"
    onRetry={mockOnRetry}
    retryAttempts={1}
  />
);

const ConnectionErrorRetrying: React.FC = () => (
  <PerpsConnectionErrorView
    error="Connection failed"
    onRetry={mockOnRetry}
    isRetrying
  />
);

const renderErrorState = (errorType: PerpsErrorType, onRetry?: () => void) =>
  renderPerpsComponent(
    PerpsErrorState as unknown as React.ComponentType<Record<string, unknown>>,
    { errorType, onRetry },
  );

describe('Error & Recovery Flow', () => {
  beforeEach(() => {
    mockOnRetry.mockClear();
  });

  it('trader encounters connection issues: loading screen, first error, retry, go-back after failure, and spinner during reconnection', async () => {
    // Step 1: Initial connection — trader sees loading skeleton with "Connecting to Perps"
    renderPerpsComponentDisconnected(
      PerpsLoadingSkeleton as unknown as React.ComponentType<
        Record<string, unknown>
      >,
    );
    expect(
      await screen.findByText(strings('perps.connection.connecting_to_perps')),
    ).toBeOnTheScreen();

    // Step 2: Connection fails — error title and retry button appear, no "Go back" yet
    cleanup();
    renderPerpsView(ConnectionErrorDefault, 'ConnectionErrorTest');
    expect(
      await screen.findByText(strings('perps.errors.connectionFailed.title')),
    ).toBeOnTheScreen();
    const retryButton = screen.getByText(
      strings('perps.errors.connectionFailed.retry'),
    );
    expect(retryButton).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.errors.connectionFailed.go_back')),
    ).not.toBeOnTheScreen();

    // Step 3: Trader presses retry — callback fires
    fireEvent.press(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);

    // Step 4: Retry failed — "Go back" button now appears alongside retry
    cleanup();
    mockOnRetry.mockClear();
    renderPerpsView(ConnectionErrorWithBack, 'ConnectionErrorTest');
    expect(
      await screen.findByText(strings('perps.errors.connectionFailed.go_back')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.errors.connectionFailed.retry')),
    ).toBeOnTheScreen();

    // Step 5: During reconnection — retry button label is hidden (spinner replaces it)
    cleanup();
    renderPerpsView(ConnectionErrorRetrying, 'ConnectionErrorTest');
    await screen.findByText(strings('perps.errors.connectionFailed.title'));
    expect(
      screen.queryByText(strings('perps.errors.connectionFailed.retry')),
    ).not.toBeOnTheScreen();
  });

  it('trader faces different error types: connection failure, network error, and unknown errors with varying retry options', async () => {
    // Step 1: CONNECTION_FAILED — title and retry button, pressing retry fires callback
    const retryFn1 = jest.fn();
    renderErrorState(PerpsErrorType.CONNECTION_FAILED, retryFn1);
    expect(
      await screen.findByText(strings('perps.errors.connectionFailed.title')),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByText(strings('perps.errors.connectionFailed.retry')),
    );
    expect(retryFn1).toHaveBeenCalledTimes(1);

    // Step 2: NETWORK_ERROR — shows title, description, and retry
    cleanup();
    const retryFn2 = jest.fn();
    renderErrorState(PerpsErrorType.NETWORK_ERROR, retryFn2);
    expect(
      await screen.findByText(strings('perps.errors.networkError.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.errors.networkError.description')),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByText(strings('perps.errors.networkError.retry')),
    );
    expect(retryFn2).toHaveBeenCalledTimes(1);

    // Step 3: UNKNOWN without retry — title + description, no retry button
    cleanup();
    renderErrorState(PerpsErrorType.UNKNOWN);
    expect(
      await screen.findByText(strings('perps.errors.unknown.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.errors.unknown.description')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('perps.errors.unknown.retry')),
    ).not.toBeOnTheScreen();

    // Step 4: UNKNOWN with retry — retry button appears and fires callback
    cleanup();
    const retryFn3 = jest.fn();
    renderErrorState(PerpsErrorType.UNKNOWN, retryFn3);
    const unknownRetry = await screen.findByText(
      strings('perps.errors.unknown.retry'),
    );
    fireEvent.press(unknownRetry);
    expect(retryFn3).toHaveBeenCalledTimes(1);
  });
});
