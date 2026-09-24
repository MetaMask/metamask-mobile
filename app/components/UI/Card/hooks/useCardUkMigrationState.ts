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
 * This hook re-resolves with a fresh `Date` whenever Card Home is focused or
 * {@link refresh} runs (e.g. pull-to-refresh).
 */
export function useCardUkMigrationState(): {
  state: CardUkMigrationState;
  refresh: () => void;
} {
  const remoteFeatureFlags = useSelector(selectRemoteFeatureFlags);
  const [evaluationTime, setEvaluationTime] = useState(() => new Date());

  const refresh = useCallback(() => {
    setEvaluationTime(new Date());
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
        evaluationTime,
      ),
    [remoteFeatureFlags, evaluationTime],
  );

  return { state, refresh };
}
