import Engine from '../../../../core/Engine';
import { selectIsFirstTimeUser } from '../controllers/selectors';
import { usePerpsSelector } from './usePerpsSelector';

/**
 * Hook to check if the user is a first-time user of perps trading
 * @returns Object with isFirstTimeUser flag and markTutorialCompleted function
 */
export function usePerpsFirstTimeUser(): {
  isFirstTimeUser: boolean;
  markTutorialCompleted: () => void;
} {
  const isFirstTimeUser = usePerpsSelector(selectIsFirstTimeUser);

  const markTutorialCompleted = () => {
    Engine.context.PerpsController?.markTutorialCompleted();
  };

  return {
    isFirstTimeUser,
    markTutorialCompleted,
  };
}
