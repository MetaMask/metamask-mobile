import { useEffect, useState } from 'react';
import { usePerpsController } from './usePerpsController';

/**
 * Hook for checking if ready to trade
 */
export function usePerpsReadiness() {
  const { controller } = usePerpsController();
  const [readiness, setReadiness] = useState({
    ready: false,
    loading: true,
    error: null as string | null,
  });

  useEffect(() => {
    const checkReadiness = async () => {
      try {
        const result = await controller.getActiveProvider().isReadyToTrade();
        setReadiness({
          ready: result.ready,
          loading: false,
          error: result.error || null,
        });
      } catch (error) {
        setReadiness({
          ready: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    checkReadiness();
  }, [controller]);

  return readiness;
}
