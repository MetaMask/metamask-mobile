/**
 * Component view tests for PerpsErrorState.
 * Tests all three error types (CONNECTION_FAILED, NETWORK_ERROR, UNKNOWN) with state transitions.
 * State-driven via Redux; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsErrorState.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsComponent } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import PerpsErrorState, { PerpsErrorType } from './PerpsErrorState';

const renderErrorState = (errorType: PerpsErrorType, onRetry?: () => void) =>
  renderPerpsComponent(
    PerpsErrorState as unknown as React.ComponentType<Record<string, unknown>>,
    { errorType, onRetry },
  );

describe('PerpsErrorState', () => {
  it('CONNECTION_FAILED: shows connection error title and retry button', async () => {
    const onRetry = jest.fn();
    renderErrorState(PerpsErrorType.CONNECTION_FAILED, onRetry);

    expect(
      await screen.findByText(strings('perps.errors.connectionFailed.title')),
    ).toBeOnTheScreen();
    const retryButton = screen.getByText(
      strings('perps.errors.connectionFailed.retry'),
    );
    expect(retryButton).toBeOnTheScreen();

    fireEvent.press(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('NETWORK_ERROR: shows network error title, description, and retry button', async () => {
    const onRetry = jest.fn();
    renderErrorState(PerpsErrorType.NETWORK_ERROR, onRetry);

    expect(
      await screen.findByText(strings('perps.errors.networkError.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.errors.networkError.description')),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByText(strings('perps.errors.networkError.retry')),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('UNKNOWN: shows generic error title and description', async () => {
    renderErrorState(PerpsErrorType.UNKNOWN);

    expect(
      await screen.findByText(strings('perps.errors.unknown.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.errors.unknown.description')),
    ).toBeOnTheScreen();
  });

  it('UNKNOWN without onRetry: does not render retry button', async () => {
    renderErrorState(PerpsErrorType.UNKNOWN);

    await screen.findByText(strings('perps.errors.unknown.title'));

    expect(
      screen.queryByText(strings('perps.errors.unknown.retry')),
    ).not.toBeOnTheScreen();
  });

  it('UNKNOWN with onRetry: renders retry button', async () => {
    const onRetry = jest.fn();
    renderErrorState(PerpsErrorType.UNKNOWN, onRetry);

    const retryButton = await screen.findByText(
      strings('perps.errors.unknown.retry'),
    );
    fireEvent.press(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
