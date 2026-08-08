import { useCallback, useEffect, useState } from 'react';
import {
  clearWalletAssistantState,
  EMPTY_WALLET_ASSISTANT_STATE,
  loadWalletAssistantState,
  normalizeWalletAssistantState,
  saveWalletAssistantState,
  WalletAssistantPersistenceState,
} from './walletAssistantPersistence';

interface UseWalletAssistantPersistenceResult {
  clear: () => Promise<void>;
  error: Error | null;
  isLoading: boolean;
  reload: () => Promise<void>;
  save: (state: WalletAssistantPersistenceState) => Promise<void>;
  state: WalletAssistantPersistenceState;
}

function toError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error('Wallet Assistant persistence failed');
}

export function useWalletAssistantPersistence(): UseWalletAssistantPersistenceResult {
  const [state, setState] = useState<WalletAssistantPersistenceState>(
    EMPTY_WALLET_ASSISTANT_STATE,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setState(await loadWalletAssistantState());
    } catch (loadError) {
      setState(EMPTY_WALLET_ASSISTANT_STATE);
      setError(toError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(
    async (nextState: WalletAssistantPersistenceState) => {
      try {
        await saveWalletAssistantState(nextState);
        setState(normalizeWalletAssistantState(nextState));
        setError(null);
      } catch (saveError) {
        const normalizedError = toError(saveError);
        setError(normalizedError);
        throw normalizedError;
      }
    },
    [],
  );

  const clear = useCallback(async () => {
    try {
      await clearWalletAssistantState();
      setState(EMPTY_WALLET_ASSISTANT_STATE);
      setError(null);
    } catch (clearError) {
      const normalizedError = toError(clearError);
      setError(normalizedError);
      throw normalizedError;
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    clear,
    error,
    isLoading,
    reload,
    save,
    state,
  };
}
