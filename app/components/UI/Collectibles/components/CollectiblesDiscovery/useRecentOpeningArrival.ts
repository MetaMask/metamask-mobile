import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import type { CollectiblesOpening } from '../../types';
import {
  advanceOpeningArrival,
  initialOpeningArrival,
} from './recentOpeningArrival';

export function useRecentOpeningArrival(
  cards: CollectiblesOpening[],
  visible: boolean,
) {
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  const [reduced, setReduced] = useState(true);
  const [state, setState] = useState(() => initialOpeningArrival(cards));
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (!cancelled) setReduced(value);
      })
      .catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    const app = AppState.addEventListener('change', (value) =>
      setForeground(value === 'active'),
    );
    return () => {
      cancelled = true;
      motion.remove();
      app.remove();
    };
  }, []);
  const active = visible && foreground && !reduced;
  useEffect(() => {
    setState((current) => advanceOpeningArrival(current, cards, active));
  }, [cards, active]);
  return { identity: state.arrivingId, active };
}
