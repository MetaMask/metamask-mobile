/**
 * Component view tests for PerpsLoadingSkeleton.
 * Tests initial loading state rendering (timeout state requires waiting 10s so is not practical for view test).
 * State-driven via Redux; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsLoadingSkeleton.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsComponentDisconnected } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import PerpsLoadingSkeleton from './PerpsLoadingSkeleton';

describe('PerpsLoadingSkeleton', () => {
  it('renders "Connecting to Perps" in initial loading state', async () => {
    renderPerpsComponentDisconnected(
      PerpsLoadingSkeleton as unknown as React.ComponentType<
        Record<string, unknown>
      >,
    );

    expect(
      await screen.findByText(strings('perps.connection.connecting_to_perps')),
    ).toBeOnTheScreen();
  });

  it('renders with custom testID', async () => {
    renderPerpsComponentDisconnected(
      PerpsLoadingSkeleton as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      { testID: 'custom-skeleton' },
    );

    expect(await screen.findByTestId('custom-skeleton')).toBeOnTheScreen();
  });
});
