import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

export const COLLECTIBLES_SKIP_REVEALS_KEY = 'collectibles.skipReveals';

/** Replit's saved reveal preference; it changes presentation, never purchasing. */
export const useSkipRevealsPreference = () => {
  const [skipReveal, setSkipReveal] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const changed = useRef(false);
  const mounted = useRef(true);
  const latestWrite = useRef(0);
  const pendingWrite = useRef(Promise.resolve());

  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(COLLECTIBLES_SKIP_REVEALS_KEY)
      .then((saved) => {
        if (mounted.current && !changed.current && saved === 'true')
          setSkipReveal(true);
      })
      .catch(() => {
        // An unavailable preference never blocks a purchase or enables skipping.
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  const updateSkipReveal = useCallback((enabled: boolean) => {
    changed.current = true;
    setSkipReveal(enabled);
    setSaveFailed(false);
    const write = ++latestWrite.current;
    // Serialize writes so rapid toggles cannot restore an older preference.
    pendingWrite.current = pendingWrite.current
      .then(() =>
        AsyncStorage.setItem(COLLECTIBLES_SKIP_REVEALS_KEY, String(enabled)),
      )
      .catch(() => {
        if (mounted.current && write === latestWrite.current)
          setSaveFailed(true);
      });
  }, []);

  return { skipReveal, updateSkipReveal, saveFailed };
};
