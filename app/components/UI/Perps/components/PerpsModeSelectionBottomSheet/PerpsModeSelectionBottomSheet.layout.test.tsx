import { PerpsMode } from '@metamask/perps-controller';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import React from 'react';
import { PerpsModeSelectionBottomSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsModeSelectionBottomSheet from './PerpsModeSelectionBottomSheet';

// Deliberately does not mock @metamask/design-system-twrnc-preset, unlike the
// sibling suite: the resolved style is the only place card height is
// observable, and mocking the preset flattens every style to {}.
describe('PerpsModeSelectionBottomSheet card sizing', () => {
  const renderSheet = () =>
    render(
      <PerpsModeSelectionBottomSheet
        selectedMode={PerpsMode.Lite}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

  it.each([
    ['lite', PerpsModeSelectionBottomSheetSelectorsIDs.LITE_OPTION],
    ['pro', PerpsModeSelectionBottomSheetSelectorsIDs.PRO_OPTION],
  ])('lets the %s card hug its content and stretch to the row', (_, testID) => {
    renderSheet();

    const style = StyleSheet.flatten(screen.getByTestId(testID).props.style);

    // Fails at `height: 186` (the old fixed value) and at `height: 48`
    // (ButtonBase's default, which applies if the override is simply removed).
    expect(style.height).toBe('auto');
    // ButtonBase defaults to flex-start, which would stop the shorter card
    // from matching the taller one.
    expect(style.alignSelf).toBe('stretch');
  });
});
