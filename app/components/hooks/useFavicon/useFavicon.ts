import { useEffect, useState } from 'react';
import { ImageSourcePropType } from 'react-native';
import {
  getFaviconURLFromHtml,
  getFaviconFromCache,
  cacheFavicon,
} from '../../../util/favicon';

//Empty value uset to trigger fallback favicon in the UI and prevent use of undefined
const EMPTY_FAVICON_URI: ImageSourcePropType = {};

const useFavicon = (origin: string) => {
  const [faviconURI, setFaviconURI] =
    useState<ImageSourcePropType>(EMPTY_FAVICON_URI);

  useEffect(() => {
    (async () => {
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
    })();
  }, [origin]);

  return faviconURI;
};

export default useFavicon;
