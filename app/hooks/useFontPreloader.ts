import { useEffect, useState } from 'react';
import FontPreloader from '../core/FontPreloader/FontPreloader';
import Logger from '../util/Logger';

/**
 * Hook to manage font preloading state
 * Returns true when all fonts are loaded and cached
 */
export const useFontPreloader = () => {
  const [fontsLoaded, setFontsLoaded] = useState(
    FontPreloader.areFontsLoaded(),
  );

  useEffect(() => {
    let isMounted = true;

    if (!fontsLoaded) {
      Logger.log('useFontPreloader: Starting font preloading...');

      FontPreloader.preloadFonts()
        .then(() => {
          if (isMounted) {
            Logger.log('useFontPreloader: Fonts loaded successfully');
            setFontsLoaded(true);
          }
        })
        .catch((error) => {
          Logger.error(
            new Error('useFontPreloader: Font loading failed'),
            error,
          );
          if (isMounted) {
            // Still set to true to prevent blocking the app
            setFontsLoaded(true);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [fontsLoaded]);

  return fontsLoaded;
};

/**
 * Hook for components that need to know when fonts are ready
 * with additional loading state information
 */
export const useFontPreloaderWithStatus = () => {
  const [status, setStatus] = useState<{
    loaded: boolean;
    loading: boolean;
    error: boolean;
  }>({
    loaded: FontPreloader.areFontsLoaded(),
    loading: !FontPreloader.areFontsLoaded(),
    error: false,
  });

  useEffect(() => {
    let isMounted = true;

    if (!status.loaded && !status.error) {
      FontPreloader.preloadFonts()
        .then(() => {
          if (isMounted) {
            setStatus({
              loaded: true,
              loading: false,
              error: false,
            });
          }
        })
        .catch((error) => {
          Logger.error(
            new Error('useFontPreloaderWithStatus: Font loading failed'),
            error,
          );
          if (isMounted) {
            setStatus({
              loaded: true, // Still set to true to prevent blocking
              loading: false,
              error: true,
            });
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [status.loaded, status.error]);

  return status;
};
