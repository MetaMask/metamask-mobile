/**
 * Component view tests for PerpsConnectionErrorView.
 * Tests retry and go-back flow with different retryAttempts states.
 * Wrapped via renderPerpsView to provide navigation context required by useNavigation().
 * State-driven via Redux; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsConnectionErrorView.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import PerpsConnectionErrorView from './PerpsConnectionErrorView';
import { renderPerpsView } from 'tests/component-view/renderers/perpsViewRenderer';

const mockOnRetry = jest.fn();

const ConnectionErrorWrapper: React.FC = () => (
  <PerpsConnectionErrorView error="Connection failed" onRetry={mockOnRetry} />
);

const ConnectionErrorWithBackWrapper: React.FC = () => (
  <PerpsConnectionErrorView
    error="Connection failed"
    onRetry={mockOnRetry}
    retryAttempts={1}
  />
);

const ConnectionErrorRetryingWrapper: React.FC = () => (
  <PerpsConnectionErrorView
    error="Connection failed"
    onRetry={mockOnRetry}
    isRetrying
  />
);

describe('PerpsConnectionErrorView', () => {
  beforeEach(() => {
    mockOnRetry.mockClear();
  });

  it('renders error title and retry button', async () => {
    renderPerpsView(ConnectionErrorWrapper, 'ConnectionErrorTest');

    expect(
      await screen.findByText(strings('perps.errors.connectionFailed.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.errors.connectionFailed.retry')),
    ).toBeOnTheScreen();
  });

  it('retry button calls onRetry', async () => {
    renderPerpsView(ConnectionErrorWrapper, 'ConnectionErrorTest');

    const retryButton = await screen.findByText(
      strings('perps.errors.connectionFailed.retry'),
    );
    fireEvent.press(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show go back button on first attempt', async () => {
    renderPerpsView(ConnectionErrorWrapper, 'ConnectionErrorTest');

    await screen.findByText(strings('perps.errors.connectionFailed.title'));

    expect(
      screen.queryByText(strings('perps.errors.connectionFailed.go_back')),
    ).not.toBeOnTheScreen();
  });

  it('shows go back button after retry attempts', async () => {
    renderPerpsView(ConnectionErrorWithBackWrapper, 'ConnectionErrorTest');

    expect(
      await screen.findByText(strings('perps.errors.connectionFailed.go_back')),
    ).toBeOnTheScreen();
  });

  it('hides default retry label when isRetrying is true', async () => {
    renderPerpsView(ConnectionErrorRetryingWrapper, 'ConnectionErrorTest');

    await screen.findByText(strings('perps.errors.connectionFailed.title'));

    expect(
      screen.queryByText(strings('perps.errors.connectionFailed.retry')),
    ).not.toBeOnTheScreen();
  });
});
