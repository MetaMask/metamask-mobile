import { useEffect, useState, useMemo } from 'react';
import Engine from '../../../../core/Engine';

/**
 * Hook for checking if ready to trade
 */
export function usePerpsReadiness() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkReadiness = async () => {
      try {
        const controller = Engine.context.PerpsController;
        const provider = controller.getActiveProvider();
        const result = await provider.isReadyToTrade();

        setReady(result.ready);
        setLoading(false);
        setError(result.error || null);
      } catch (initError) {
        setReady(false);
        setLoading(false);
        setError(
          initError instanceof Error ? initError.message : 'Unknown error',
        );
      }
    };

    checkReadiness();
  }, []);

  return useMemo(
    () => ({
      ready,
      loading,
      error,
    }),
    [ready, loading, error],
  );
}
