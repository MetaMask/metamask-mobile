import React, { createRef } from 'react';
import { type View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { CollectiblesCarouselTestIds } from '../../Collectibles.testIds';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createPack } from '../testUtils';
import CollectiblesPackHero from './CollectiblesPackHero';

// Native responder identity is not observable through CV's touch abstraction.
// This narrow contract protects an in-flight swipe from parent route updates.
describe('pack detail wheel navigation', () => {
  const packs = [25, 50, 100].map((price) =>
    createPack({ code: `pokemon_${price}`, price }),
  );
  const onSelect = jest.fn();
  const onMeasure = jest.fn();
  const destinationRef = createRef<View>();
  const scrollGesture = Gesture.Native();
  const hero = (index: number) => (
    <CollectiblesPackHero
      scrollGesture={scrollGesture}
      pack={packs[index]}
      packs={packs}
      height={450}
      active
      animate={false}
      hidden={false}
      onSelect={onSelect}
      destinationRef={destinationRef}
      onMeasure={onMeasure}
    />
  );

  afterEach(() => {
    jest.restoreAllMocks();
    onSelect.mockClear();
  });

  it('centers a new external pack route even when the category stays the same', () => {
    const { rerender } = renderWithProvider(hero(0));

    rerender(hero(1));
    fireEvent.press(
      screen.getByTestId(`collectibles-hero-pack-${packs[0].code}`),
    );

    expect(onSelect).toHaveBeenLastCalledWith(packs[0]);
  });

  it('retains its responder when the route acknowledges a wheel selection', () => {
    const { rerender } = renderWithProvider(hero(0));

    fireEvent.press(
      screen.getByTestId(`collectibles-hero-pack-${packs[1].code}`),
    );
    expect(onSelect).toHaveBeenLastCalledWith(packs[1]);
    const pan = getByGestureTestId(CollectiblesCarouselTestIds.PAN);
    rerender(hero(1));

    expect(getByGestureTestId(CollectiblesCarouselTestIds.PAN)).toBe(pan);
  });
});
