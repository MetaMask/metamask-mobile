import { useEffect, useState } from 'react';
import { ImageURISource } from 'react-native';
import {
  getFaviconURLFromHtml,
  getFaviconFromCache,
  cacheFavicon,
} from '../../../util/favicon';
import Logger from '../../../util/Logger';

//Empty value uset to trigger fallback favicon in the UI and prevent use of undefined
const EMPTY_FAVICON_URI: ImageURISource = {};

/**
 * Custom hook that returns the favicon URI for the given origin
 * @param origin (ie: 'metamask.github.io' or full dapp URL 'https://metamask.github.io/test-dapp/')
 */
const useFavicon = (origin: string) => {
  const [faviconURI, setFaviconURI] =
    useState<ImageURISource>(EMPTY_FAVICON_URI);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setIsLoaded(false);
      try {
        // If the origin is null, we don't want to fetch a favicon
        // This can happen when the site is unreachable (DNS error)
        if (!origin || origin === 'null') {
          setIsLoading(false);
          setIsLoaded(true);
          return;
        }
        const cachedFaviconUrl = await getFaviconFromCache(origin);
        if (cachedFaviconUrl) {
          setFaviconURI({ uri: cachedFaviconUrl });
        } else {
          const fetchedFaviconUrl = await getFaviconURLFromHtml(origin);
          if (fetchedFaviconUrl) {
            cacheFavicon(origin, fetchedFaviconUrl);
            setFaviconURI({ uri: fetchedFaviconUrl?.toString() });
          }
        }
      } catch (error) {
        await Logger.log('Error fetching or caching favicon: ', error);
      }
      setIsLoading(false);
      setIsLoaded(true);
    })();
  }, [origin]);

  return { faviconURI, isLoading, isLoaded };
};

export default useFavicon;
