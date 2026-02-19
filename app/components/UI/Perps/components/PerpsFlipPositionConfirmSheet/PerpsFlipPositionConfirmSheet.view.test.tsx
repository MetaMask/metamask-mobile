/**
 * Component view tests for PerpsFlipPositionConfirmSheet.
 * Covers: PerpsFlipPositionConfirmSheet + PerpsFeesDisplay (rendered inside).
 * Wrapped via renderPerpsView to provide navigation context required by BottomSheet.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsFlipPositionConfirmSheet.view.test"
 */
import '../../../../../util/test/component-view/mocks';
import React from 'react';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  renderPerpsView,
  defaultPositionForViews,
} from '../../../../../util/test/component-view/renderers/perpsViewRenderer';
import PerpsFlipPositionConfirmSheet from './PerpsFlipPositionConfirmSheet';

const FlipSheetWrapper: React.FC = () => (
  <PerpsFlipPositionConfirmSheet
    position={defaultPositionForViews}
    onClose={jest.fn()}
    onConfirm={jest.fn()}
  />
);

describe('PerpsFlipPositionConfirmSheet', () => {
  it('renders flip position title and action buttons', async () => {
    renderPerpsView(FlipSheetWrapper, 'FlipSheetTest', {
      streamOverrides: { positions: [defaultPositionForViews] },
    });

    expect(
      await screen.findByText(strings('perps.flip_position.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.flip_position.flip')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.flip_position.cancel')),
    ).toBeOnTheScreen();
  });

  it('displays direction and estimated size labels', async () => {
    renderPerpsView(FlipSheetWrapper, 'FlipSheetTest', {
      streamOverrides: { positions: [defaultPositionForViews] },
    });

    expect(
      await screen.findByText(strings('perps.flip_position.direction')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('perps.flip_position.est_size')),
    ).toBeOnTheScreen();
  });
});
