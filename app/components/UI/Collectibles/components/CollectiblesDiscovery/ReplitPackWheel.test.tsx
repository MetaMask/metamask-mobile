import React from 'react';
import { Animated, Dimensions, ScrollView } from 'react-native';
import {
  Gesture,
  GestureDetector,
  State,
  type PanGesture,
} from 'react-native-gesture-handler';
import {
  fireGestureHandler,
  getByGestureTestId,
} from 'react-native-gesture-handler/jest-utils';
import { act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createPack } from '../../views/testUtils';
import { CollectiblesCarouselTestIds } from '../../Collectibles.testIds';
import ReplitPackWheel from './ReplitPackWheel';
import { REPLIT_WHEEL } from './ReplitPackWheel.motion';

// Native configuration and animation-graph contracts require inspection below
// CV's user-facing boundary. Screen selection/navigation is covered in OverviewTab.view.
const packs = [25, 50, 100].map((price) =>
  createPack({ code: `pokemon_${price}`, price }),
);
const renderWheel = (active = true) => {
  const onSelect = jest.fn();
  const scrollGesture = Gesture.Native();
  renderWithProvider(
    <GestureDetector gesture={scrollGesture}>
      <ScrollView>
        <ReplitPackWheel
          packs={packs}
          animate={false}
          active={active}
          onSelect={onSelect}
          scrollGesture={scrollGesture}
        />
      </ScrollView>
    </GestureDetector>,
  );
  return { onSelect, scrollGesture };
};

describe('ReplitPackWheel native gesture contract', () => {
  afterEach(() => jest.restoreAllMocks());

  it('makes the owning native scroll wait for the horizontal recognizer to fail', () => {
    const { scrollGesture } = renderWheel();
    const pan = getByGestureTestId(CollectiblesCarouselTestIds.PAN);

    expect(pan.config.blocksHandlers).toContain(scrollGesture);
    expect(pan.config).toEqual(
      expect.objectContaining({
        activeOffsetXStart: -8,
        activeOffsetXEnd: 8,
        failOffsetYStart: -8,
        failOffsetYEnd: 8,
      }),
    );
  });

  it('preserves native animation nodes when selection changes during a drag', () => {
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const { onSelect } = renderWheel();
    const pan = getByGestureTestId(CollectiblesCarouselTestIds.PAN);
    const nodeCount = interpolate.mock.calls.length;
    const slot = Dimensions.get('window').width * REPLIT_WHEEL.slotRatio;

    act(() =>
      fireGestureHandler<PanGesture>(pan, [
        { state: State.BEGAN, translationX: 0 },
        { state: State.ACTIVE, translationX: -20 },
        { state: State.ACTIVE, translationX: -slot * 0.8 },
        { state: State.END, translationX: -slot * 0.8, velocityX: 0 },
      ]),
    );

    expect(onSelect).toHaveBeenLastCalledWith(1);
    expect(nodeCount).toBeGreaterThan(0);
    expect(interpolate).toHaveBeenCalledTimes(nodeCount);
    expect(getByGestureTestId(CollectiblesCarouselTestIds.PAN)).toBe(pan);
  });

  it('does not capture touches while the carousel is inactive', () => {
    renderWheel(false);

    expect(
      getByGestureTestId(CollectiblesCarouselTestIds.PAN).config.enabled,
    ).toBe(false);
  });
});
