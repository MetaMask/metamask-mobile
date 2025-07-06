import { useRef, useEffect, useCallback } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';

/**
 * Hook to monitor navigation and manage Perps WebSocket connections
 * Automatically disconnects when leaving Perps routes and reconnects when entering
 */
export function usePerpsNavigationMonitoring() {
  const previousRouteRef = useRef<string | null>(null);
  const isPerpsActiveRef = useRef<boolean>(false);

  const isPerpsRoute = (routeName?: string): boolean => routeName?.startsWith('Perps') || false;

  const handleRouteChange = useCallback(async (currentRoute?: string) => {
    const previousRoute = previousRouteRef.current;
    const wasInPerps = isPerpsActiveRef.current;
    const isInPerps = isPerpsRoute(currentRoute);

    // Update refs
    previousRouteRef.current = currentRoute || null;
    isPerpsActiveRef.current = isInPerps;

    // Handle transitions
    if (!wasInPerps && isInPerps) {
      // Entering Perps
      DevLogger.log('PerpsNavigation: Entering Perps section', {
        route: currentRoute,
        timestamp: new Date().toISOString()
      });
      // WebSocket connections will be created on-demand by hooks

    } else if (wasInPerps && !isInPerps) {
      // Leaving Perps
      DevLogger.log('PerpsNavigation: Leaving Perps section', {
        previousRoute,
        newRoute: currentRoute,
        timestamp: new Date().toISOString()
      });

      // Disconnect all Perps WebSocket connections
      try {
        const perpsController = Engine.context.PerpsController;
        if (perpsController) {
          await perpsController.disconnect();
          DevLogger.log('PerpsNavigation: Successfully disconnected Perps WebSocket connections', {
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        DevLogger.log('PerpsNavigation: Error disconnecting Perps connections', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
  }, []);

  // Cleanup on unmount (app closing)
  useEffect(() => () => {
    if (isPerpsActiveRef.current) {
      DevLogger.log('PerpsNavigation: App unmounting, cleaning up Perps connections', {
        timestamp: new Date().toISOString()
      });
      try {
        const perpsController = Engine.context.PerpsController;
        if (perpsController) {
          perpsController.disconnect();
        }
      } catch (error) {
        // Ignore errors during app shutdown
      }
    }
  }, []);

  return { handleRouteChange };
}