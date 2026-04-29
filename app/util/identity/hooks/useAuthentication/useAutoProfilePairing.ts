import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { performProfilePairing } from '../../../../actions/identity';
import {
  selectIsUnlocked,
  selectKeyrings,
} from '../../../../selectors/keyringController';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectHasPairedAtLeastOnce } from '../../../../selectors/identity';
import { selectCompletedOnboarding } from '../../../../selectors/onboarding';

/**
 * Custom hook to manage automatically pairing SRP profiles based on the app state.
 *
 * Fires `performProfilePairing` on first launch (when `hasPairedAtLeastOnce` is
 * false) and whenever a new keyring is added. The controller itself is a no-op
 * when fewer than 2 SRPs exist, so single-SRP wallets are unaffected.
 *
 * @returns An object containing:
 * - `autoProfilePairing`: A function to trigger profile pairing if necessary.
 * - `shouldAutoProfilePairing`: A boolean indicating whether pairing should run.
 * - `setHasNewKeyrings`: Setter exposed for unit tests only — do not use in production.
 */
export function useAutoProfilePairing(): {
  autoProfilePairing: () => Promise<void>;
  shouldAutoProfilePairing: boolean;
  setHasNewKeyrings: (hasNewKeyrings: boolean) => void;
} {
  const [hasNewKeyrings, setHasNewKeyrings] = useState(false);

  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const isBasicFunctionalityEnabled = Boolean(
    useSelector(selectBasicFunctionalityEnabled),
  );
  const completedOnboarding = useSelector(selectCompletedOnboarding);
  const hasPairedAtLeastOnce = useSelector(selectHasPairedAtLeastOnce);

  const keyrings = useSelector(selectKeyrings);
  const previousKeyringsLength = useRef(keyrings.length);

  useEffect(() => {
    if (keyrings.length !== previousKeyringsLength.current) {
      previousKeyringsLength.current = keyrings.length;
      setHasNewKeyrings(true);
    }
  }, [keyrings.length]);

  const shouldAutoProfilePairing = useMemo(
    () =>
      (!hasPairedAtLeastOnce || hasNewKeyrings) &&
      isUnlocked &&
      isBasicFunctionalityEnabled &&
      completedOnboarding,
    [
      hasPairedAtLeastOnce,
      hasNewKeyrings,
      isUnlocked,
      isBasicFunctionalityEnabled,
      completedOnboarding,
    ],
  );

  const autoProfilePairing = useCallback(async () => {
    if (shouldAutoProfilePairing) {
      await performProfilePairing();
      if (hasNewKeyrings) {
        setHasNewKeyrings(false);
      }
    }
  }, [shouldAutoProfilePairing, hasNewKeyrings]);

  return {
    autoProfilePairing,
    shouldAutoProfilePairing,
    // Used in unit tests to simulate new keyrings being detected, should not be used in production code
    setHasNewKeyrings,
  };
}
