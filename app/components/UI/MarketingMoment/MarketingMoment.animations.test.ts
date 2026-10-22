import { AnimationDuration } from '@metamask/design-tokens';
import { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  MARKETING_MOMENT_ACTION_ENTER_STEP,
  marketingMomentActionsEnteredAt,
  marketingMomentEntrance,
  marketingMomentSlotEntering,
} from './MarketingMoment.animations';

describe('marketingMomentEntrance', () => {
  it('returns no animation when reduce motion is on', () => {
    const entering = marketingMomentEntrance(FadeInDown, 0, true);

    expect(entering).toBeUndefined();
  });

  it('returns a delayed fade when reduce motion is off', () => {
    const entering = marketingMomentEntrance(FadeInDown, 1, false);

    expect(entering?.getDelay()).toBe(AnimationDuration.Quickly);
    expect(entering?.getDuration()).toBe(AnimationDuration.Slowly);
  });

  it('times the footer to the action step', () => {
    const enteredAt =
      MARKETING_MOMENT_ACTION_ENTER_STEP * AnimationDuration.Quickly +
      AnimationDuration.Slowly;

    expect(marketingMomentActionsEnteredAt).toBe(enteredAt);
  });
});

describe('marketingMomentSlotEntering', () => {
  it('drops a caller entrance when reduce motion is on', () => {
    const custom = FadeIn.duration(1);

    const entering = marketingMomentSlotEntering(
      true,
      { entering: custom },
      FadeInDown.duration(1),
    );

    expect(entering).toBeUndefined();
  });

  it('keeps an explicit empty entrance from the caller', () => {
    const entering = marketingMomentSlotEntering(
      false,
      { entering: undefined },
      FadeInDown.duration(1),
    );

    expect(entering).toBeUndefined();
  });

  it('uses the template entrance when the caller does not set one', () => {
    const fallback = FadeIn.duration(AnimationDuration.Slowly);

    const entering = marketingMomentSlotEntering(
      false,
      { testID: 'art' },
      fallback,
    );

    expect(entering).toBe(fallback);
  });
});
