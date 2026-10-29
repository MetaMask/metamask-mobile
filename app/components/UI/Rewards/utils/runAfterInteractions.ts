import { InteractionManager } from 'react-native';

/**
 * Runs `task` after the current interaction so it is not on the path that
 * paints the Rewards shell.
 */
export function runAfterInteractions(task: () => void): { cancel: () => void } {
  const handle = InteractionManager.runAfterInteractions(task);
  return {
    cancel: () => {
      handle.cancel();
    },
  };
}
