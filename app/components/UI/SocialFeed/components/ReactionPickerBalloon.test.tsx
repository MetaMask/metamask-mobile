import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import ReactionPickerBalloon from './ReactionPickerBalloon';
import { ReactionPickerBalloonSelectorsIDs } from './ReactionPickerBalloon.testIds';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const mockUseWindowDimensions = jest.mocked(useWindowDimensions);

const WINDOW_WIDTH = 390;

describe('ReactionPickerBalloon', () => {
  const anchor = { x: 20, y: 120, width: 40, height: 24 };

  beforeEach(() => {
    mockUseWindowDimensions.mockReturnValue({
      width: WINDOW_WIDTH,
      height: 844,
      scale: 3,
      fontScale: 1,
    });
  });

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

  it('renders overflow emojis in a horizontal strip', () => {
    renderWithProvider(
      <ReactionPickerBalloon
        visible
        anchor={anchor}
        onClose={jest.fn()}
        onPick={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.STRIP),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`${ReactionPickerBalloonSelectorsIDs.EMOJI}-🐐`),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`${ReactionPickerBalloonSelectorsIDs.EMOJI}-👎`),
    ).toBeOnTheScreen();
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

  it('aligns the balloon with the leading edge of the heart', () => {
    renderWithProvider(
      <ReactionPickerBalloon
        visible
        anchor={anchor}
        onClose={jest.fn()}
        onPick={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
    ).toHaveStyle({ left: 20 });
  });

  describe('tray position', () => {
    it('opens from the row leading edge and fills the window to the right margin', () => {
      renderWithProvider(
        <ReactionPickerBalloon
          visible
          anchor={{ x: 16, y: 200, width: 300, height: 40 }}
          onClose={jest.fn()}
          onPick={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
      ).toHaveStyle({ left: 16, width: WINDOW_WIDTH - 16 - 8 });
    });

    it('never extends past the right window edge', () => {
      renderWithProvider(
        <ReactionPickerBalloon
          visible
          anchor={{ x: 300, y: 200, width: 40, height: 40 }}
          onClose={jest.fn()}
          onPick={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
      ).toHaveStyle({ left: 262, width: 120 });
    });

    it('keeps a 120pt minimum tray width on a narrow window', () => {
      mockUseWindowDimensions.mockReturnValue({
        width: 200,
        height: 844,
        scale: 3,
        fontScale: 1,
      });

      renderWithProvider(
        <ReactionPickerBalloon
          visible
          anchor={{ x: 100, y: 200, width: 40, height: 40 }}
          onClose={jest.fn()}
          onPick={jest.fn()}
        />,
      );

      expect(
        screen.getByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
      ).toHaveStyle({ width: 120 });
    });
  });
});
