import { useEffect, useMemo, useState } from 'react';
import {
  buildMockGameUpdate,
  MOCK_GAME_UPDATE_SCRIPT,
} from '../../../mocks/mockLiveGame';
import type { GameUpdate } from '../../../types';

const MOCK_UPDATE_INTERVAL_MS = 12_000;

/**
 * Scripted stand-in for `useLiveGameUpdates` used by the Game Live screen's
 * mock demo mode. Steps through the scripted anchor sequence on a timer so
 * the simulator, header, and feed all animate without a real live game.
 */
export const useMockGameUpdates = (enabled: boolean): GameUpdate | null => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    setStepIndex(0);
    const intervalId = setInterval(() => {
      setStepIndex((previous) =>
        Math.min(previous + 1, MOCK_GAME_UPDATE_SCRIPT.length - 1),
      );
    }, MOCK_UPDATE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [enabled]);

  return useMemo(
    () => (enabled ? buildMockGameUpdate(stepIndex) : null),
    [enabled, stepIndex],
  );
};
