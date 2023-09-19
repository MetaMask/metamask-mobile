import { useEffect, useState } from 'react';
import { ImageSourcePropType } from 'react-native';
import {
  getFaviconURLFromHtml,
  getFaviconFromCache,
  cacheFavicon,
} from '../../../util/favicon';
import Logger from '../../../util/Logger';

//Empty value uset to trigger fallback favicon in the UI and prevent use of undefined
const EMPTY_FAVICON_URI: ImageSourcePropType = {};

/**
 * Custom hook that returns the favicon URI for the given origin
 * @param origin (ie: 'metamask.github.io' or full dapp URL 'https://metamask.github.io/test-dapp/')
 */
const useFavicon = (origin: string) => {
  const [faviconURI, setFaviconURI] =
    useState<ImageSourcePropType>(EMPTY_FAVICON_URI);

  useEffect(() => {
    (async () => {
      try {
        // If the origin is null, we don't want to fetch a favicon
        // This can happen when the site is unreachable (DNS error)
        if (!origin || origin === 'null') {
          return;
        }
        const cachedFaviconUrl = await getFaviconFromCache(origin);
        if (cachedFaviconUrl) {
          setFaviconURI({ uri: cachedFaviconUrl });
        } else {
          const fetchedFaviconUrl = await getFaviconURLFromHtml(origin);
          await cacheFavicon(origin, fetchedFaviconUrl);
          setFaviconURI({ uri: fetchedFaviconUrl });
        }
      } catch (error) {
        await Logger.log('Error fetching or caching favicon: ', error);
      }
    })();
  }, [origin]);

  return faviconURI;
};

export default useFavicon;
