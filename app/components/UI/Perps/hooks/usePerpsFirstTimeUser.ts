import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../core/Engine';
import useSelectedAccount from '../../Tabs/TabThumbnail/useSelectedAccount';

/**
 * Hook to check if the user is a first-time user of perps trading
 * @returns Object with isFirstTimeUser flag and loading state
 */
export function usePerpsFirstTimeUser(): {
  isFirstTimeUser: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = useSelectedAccount();
  const checkFirstTimeUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const perpsController = Engine.context.PerpsController;
      if (!perpsController) {
        throw new Error('Perps controller not initialized');
      }

      const isFirstTime = await perpsController.getIsFirstTimeUser({
        accountId: selectedAccount?.caipAccountId,
      });
      setIsFirstTimeUser(isFirstTime);
    } catch (err) {
      // Default to showing tutorial if we can't determine status
      setIsFirstTimeUser(true);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccount?.caipAccountId]);

  useEffect(() => {
    checkFirstTimeUser();
  }, [checkFirstTimeUser]);

  return {
    isFirstTimeUser,
    isLoading,
    error,
    refresh: checkFirstTimeUser,
  };
}
