/**
 * Component view tests for PerpsFlipPositionConfirmSheet.
 * Covers: PerpsFlipPositionConfirmSheet + PerpsFeesDisplay (rendered inside).
 * Tests rendering of flip confirmation UI with position data from stream.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsFlipPositionConfirmSheet.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  renderPerpsComponent,
  defaultPositionForViews,
} from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import PerpsFlipPositionConfirmSheet from './PerpsFlipPositionConfirmSheet';

const renderFlipSheet = (positionOverrides: Record<string, unknown> = {}) =>
  renderPerpsComponent(
    PerpsFlipPositionConfirmSheet as unknown as React.ComponentType<
      Record<string, unknown>
    >,
    {
      position: { ...defaultPositionForViews, ...positionOverrides },
      onClose: jest.fn(),
      onConfirm: jest.fn(),
    },
    { streamOverrides: { positions: [defaultPositionForViews] } },
  );

describe('PerpsFlipPositionConfirmSheet', () => {
  it('renders flip position title and action buttons', async () => {
    renderFlipSheet();

    expect(
      await screen.findByText(strings('perps.flip_position.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.flip_position.flip')),
    ).toBeOnTheScreen();
    expect(screen.getByText(strings('perps.modify.cancel'))).toBeOnTheScreen();
  });

  it('displays direction and estimated size labels', async () => {
    renderFlipSheet();

    expect(
      await screen.findByText(strings('perps.flip_position.direction')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.flip_position.est_size')),
    ).toBeOnTheScreen();
  });
});
