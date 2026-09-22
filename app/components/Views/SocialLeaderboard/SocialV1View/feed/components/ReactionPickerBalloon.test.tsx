import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import ReactionPickerBalloon from './ReactionPickerBalloon';
import { ReactionPickerBalloonSelectorsIDs } from './ReactionPickerBalloon.testIds';

describe('ReactionPickerBalloon', () => {
  const anchor = { x: 20, y: 120, width: 40, height: 24 };

  it('calls onPick with the tapped emoji', () => {
    const onPick = jest.fn();

    renderWithProvider(
      <ReactionPickerBalloon
        visible
        anchor={anchor}
        onClose={jest.fn()}
        onPick={onPick}
      />,
    );

    fireEvent.press(
      screen.getByTestId(`${ReactionPickerBalloonSelectorsIDs.EMOJI}-🔥`),
    );

    expect(onPick).toHaveBeenCalledWith('🔥');
  });

  it('calls onClose when the scrim is pressed', () => {
    const onClose = jest.fn();

    renderWithProvider(
      <ReactionPickerBalloon
        visible
        anchor={anchor}
        onClose={onClose}
        onPick={jest.fn()}
      />,
    );

    fireEvent.press(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.SCRIM),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
