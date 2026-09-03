import { useSelector } from 'react-redux';
import { useReduceMotionState } from '../../../Money/hooks/useReduceMotion';
import { selectMoneyCardEducationAnimationEnabledFlag } from '../../../Money/selectors/featureFlags';

export type CardEducationAnimationState = 'pending' | 'animate' | 'static';

/**
 * Whether the card education screen should animate, render static, or withhold
 * content until the decision is known.
 *
 * `pending` exists so the first paint never flashes: reduce-motion users would
 * otherwise see a frame of animation, and animated users a frame of static
 * content.
 */
export function useCardEducationAnimationState(): CardEducationAnimationState {
  const flagEnabled = useSelector(selectMoneyCardEducationAnimationEnabledFlag);
  // `null` while the async accessibility check is in flight. The shared hook
  // resolves to "reduce motion on" if reading the setting fails, so a failure
  // lands on the static path instead of staying pending forever.
  const reduceMotion = useReduceMotionState();

  if (!flagEnabled) {
    return 'static';
  }
  if (reduceMotion === null) {
    return 'pending';
  }
  return reduceMotion ? 'static' : 'animate';
}
