import Engine from '../../../../core/Engine';
import { selectIsFirstTimeUser } from '../controllers/selectors';
import { usePerpsSelector } from './usePerpsSelector';

/**
 * Hook to check if the user is a first-time user of perps trading
 * @returns Object with isFirstTimeUser flag, markTutorialCompleted function, and resetFirstTimeUserState function
 */
export function usePerpsFirstTimeUser(): {
  isFirstTimeUser: boolean;
  markTutorialCompleted: () => void;
  resetFirstTimeUserState: () => void;
} {
  const isFirstTimeUser = usePerpsSelector(selectIsFirstTimeUser);

  const markTutorialCompleted = () => {
    Engine.context.PerpsController?.markTutorialCompleted();
  };

  const resetFirstTimeUserState = () => {
    Engine.context.PerpsController?.resetFirstTimeUserState();
  };

  return {
    isFirstTimeUser,
    markTutorialCompleted,
    resetFirstTimeUserState,
  };
}
