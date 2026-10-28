import { useCallback, useEffect, useState } from 'react';
import {
  getOwnedTokensMode,
  setOwnedTokensMode,
  subscribeOwnedTokensMode,
  type OwnedTokensMode,
} from './ownedTokensSession';

export const useOwnedTokensMode = (): [
  OwnedTokensMode,
  (mode: OwnedTokensMode) => void,
] => {
  const [mode, setMode] = useState<OwnedTokensMode>(getOwnedTokensMode);

  useEffect(
    () =>
      subscribeOwnedTokensMode(() => {
        setMode(getOwnedTokensMode());
      }),
    [],
  );

  const updateMode = useCallback((next: OwnedTokensMode) => {
    setOwnedTokensMode(next);
  }, []);

  return [mode, updateMode];
};
