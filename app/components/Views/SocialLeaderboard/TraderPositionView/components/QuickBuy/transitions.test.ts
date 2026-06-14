import type { SharedValue } from 'react-native-reanimated';
import {
  makeScreenTransitions,
  SCREEN_DEPTH,
  SCREEN_SLIDE_OFFSET,
  type ScreenDirection,
} from './transitions';

jest.mock('react-native-reanimated', () => ({
  withTiming: (toValue: number) => toValue,
}));

interface ResolvedAnimation {
  initialValues: {
    opacity: number;
    transform: [{ translateX: number }];
  };
  animations: {
    opacity: number;
    transform: [{ translateX: number }];
  };
}

const directionSV = (value: ScreenDirection): SharedValue<ScreenDirection> =>
  ({ value }) as SharedValue<ScreenDirection>;

const resolve = (fn: () => unknown): ResolvedAnimation =>
  fn() as ResolvedAnimation;

describe('SCREEN_DEPTH', () => {
  it('maps every screen to its navigation depth', () => {
    expect(SCREEN_DEPTH).toEqual({
      amount: 0,
      payWith: 1,
      quoteDetails: 1,
      selectQuote: 2,
      priceImpactConfirm: 1,
    });
  });
});

describe('SCREEN_SLIDE_OFFSET', () => {
  it('is a positive horizontal distance', () => {
    expect(SCREEN_SLIDE_OFFSET).toBeGreaterThan(0);
  });
});

describe('makeScreenTransitions', () => {
  describe('forward direction (deeper)', () => {
    const { entering, exiting } = makeScreenTransitions(directionSV(1));

    it('enters from the right and fades in', () => {
      const { initialValues, animations } = resolve(entering as () => unknown);

      expect(initialValues.opacity).toBe(0);
      expect(initialValues.transform[0].translateX).toBe(SCREEN_SLIDE_OFFSET);
      expect(animations.opacity).toBe(1);
      expect(animations.transform[0].translateX).toBe(0);
    });

    it('exits to the left and fades out', () => {
      const { initialValues, animations } = resolve(exiting as () => unknown);

      expect(initialValues.opacity).toBe(1);
      expect(initialValues.transform[0].translateX).toBe(0);
      expect(animations.opacity).toBe(0);
      expect(animations.transform[0].translateX).toBe(-SCREEN_SLIDE_OFFSET);
    });
  });

  describe('back direction (shallower)', () => {
    const { entering, exiting } = makeScreenTransitions(directionSV(-1));

    it('enters from the left and fades in', () => {
      const { initialValues, animations } = resolve(entering as () => unknown);

      expect(initialValues.opacity).toBe(0);
      expect(initialValues.transform[0].translateX).toBe(-SCREEN_SLIDE_OFFSET);
      expect(animations.opacity).toBe(1);
      expect(animations.transform[0].translateX).toBe(0);
    });

    it('exits to the right and fades out', () => {
      const { initialValues, animations } = resolve(exiting as () => unknown);

      expect(initialValues.opacity).toBe(1);
      expect(initialValues.transform[0].translateX).toBe(0);
      expect(animations.opacity).toBe(0);
      expect(animations.transform[0].translateX).toBe(SCREEN_SLIDE_OFFSET);
    });
  });

  it('reads the direction lazily so a shared-value change flips the animation', () => {
    const sv = directionSV(1);
    const { entering } = makeScreenTransitions(sv);

    const forward = resolve(entering as () => unknown);
    expect(forward.initialValues.transform[0].translateX).toBe(
      SCREEN_SLIDE_OFFSET,
    );

    sv.value = -1;
    const back = resolve(entering as () => unknown);
    expect(back.initialValues.transform[0].translateX).toBe(
      -SCREEN_SLIDE_OFFSET,
    );
  });
});
