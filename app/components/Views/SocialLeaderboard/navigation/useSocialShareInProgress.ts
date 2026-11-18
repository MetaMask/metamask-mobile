import { useCallback, useEffect, useRef, useState } from 'react';
import { fireImpact, ImpactMoment } from '../../../../util/haptics';

/**
 * Tracks a share while its preview card renders and its link is created,
 * which can take a few seconds. `runShare` ignores taps while one is in
 * progress; `isSharing` drives the share button's spinner. A haptic plays
 * when a share starts and again when its spinner stops.
 *
 * @returns `isSharing`, and `runShare` to wrap a share that resolves once the
 * share sheet opens (`shareSocialProfile` / `shareSocialTraderPosition`).
 */
export const useSocialShareInProgress = () => {
  const [isSharing, setIsSharing] = useState(false);
  const inProgress = useRef(false);
  const isMounted = useRef(true);

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  const runShare = useCallback((share: () => Promise<void>) => {
    if (inProgress.current) {
      return;
    }
    inProgress.current = true;
    fireImpact(ImpactMoment.SecondaryCTA);
    setIsSharing(true);
    share()
      .catch(() => undefined)
      .finally(() => {
        inProgress.current = false;
        if (isMounted.current) {
          fireImpact(ImpactMoment.SecondaryCTA);
          setIsSharing(false);
        }
      });
  }, []);

  return { isSharing, runShare };
};
