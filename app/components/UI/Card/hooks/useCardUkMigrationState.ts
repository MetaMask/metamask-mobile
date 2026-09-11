import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import {
  resolveCardUkMigrationState,
  type CardRemoteFeatureFlags,
  type CardUkMigrationState,
} from '../../../../selectors/featureFlagController/card';

/**
 * Live UK migration phase for Card Home.
 *
 * `selectCardUkMigrationState` is memoized on the remote flag bag only, so a
 * soft → forced transition at `endDate` would stay frozen until flags change.
 * This hook re-resolves with `Date.now()` whenever Card Home is focused or
 * {@link refresh} runs (e.g. pull-to-refresh).
 */
export function useCardUkMigrationState(): {
  state: CardUkMigrationState;
  refresh: () => void;
} {
  const remoteFeatureFlags = useSelector(selectRemoteFeatureFlags);
  const [evaluationEpoch, setEvaluationEpoch] = useState(0);

  const refresh = useCallback(() => {
    setEvaluationEpoch((epoch) => epoch + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const state = useMemo(
    () =>
      resolveCardUkMigrationState(
        remoteFeatureFlags as CardRemoteFeatureFlags,
        new Date(),
      ),
    // Re-resolve whenever flags change or Card Home asks for a fresh clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evaluationEpoch is the intentional clock bump
    [remoteFeatureFlags, evaluationEpoch],
  );

  return { state, refresh };
}
