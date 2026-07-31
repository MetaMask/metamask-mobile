import { useEffect, useRef } from 'react';
import { useNavigation, type NavigationAction } from '@react-navigation/native';

export type PreventRemoveCallback = (options: {
  data: { action: NavigationAction };
}) => void;

/**
 * v6-compatible shim of React Navigation 7's `usePreventRemove`.
 *
 * Uses `beforeRemove` + `preventDefault` under the hood. During the v7 upgrade
 * (Phase 4), replace imports of this module with
 * `import { usePreventRemove } from '@react-navigation/native'`.
 *
 * @param preventRemove - When true, the screen cannot be removed and `callback` runs.
 * @param callback - Invoked when removal is prevented. Dispatch `data.action` to allow leave.
 */
export function usePreventRemove(
  preventRemove: boolean,
  callback: PreventRemoveCallback,
): void {
  const navigation = useNavigation();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!preventRemove) {
      return;
    }

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      callbackRef.current({ data: { action: e.data.action } });
    });

    return unsubscribe;
  }, [navigation, preventRemove]);
}
