import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

const PROVIDERS_SCHEMES = ['robinhood', 'cbwallet'];

export function useInstalledProviderApps() {
  const [installedProviderApps, setInstalledProviderApps] = useState(
    {} as Record<string, boolean>,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInstalledProviderApps = async () => {
      try {
        const installedProviderAppsMap = await Promise.all(
          PROVIDERS_SCHEMES.map(async (scheme) => {
            try {
              const canOpen = await Linking.canOpenURL(`${scheme}://`);
              return [scheme, canOpen] as const;
            } catch (error) {
              return [scheme, false] as const;
            }
          }),
        ).then((results) =>
          results.reduce((acc, [scheme, isInstalled]) => {
            acc[scheme] = isInstalled;
            return acc;
          }, {} as Record<string, boolean>),
        );
        setInstalledProviderApps(installedProviderAppsMap);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstalledProviderApps();
  }, []);

  return [isLoading, installedProviderApps] as const;
}
