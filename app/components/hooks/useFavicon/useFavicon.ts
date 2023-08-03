import { useEffect, useState } from 'react';
import { ImageSourcePropType } from 'react-native';
import getFaviconURLFromHtml from '../../../util/favicon';

//Empty value uset to trigger fallback favicon in the UI and prevent use of undefined
const EMPTY_FAVICON_URI = {};

const useFavicon = (origin: string) => {
  const [faviconURI, setFaviconURI] =
    useState<ImageSourcePropType>(EMPTY_FAVICON_URI);

  const cacheFavicon = async (originUrl: string, faviconUrl: string) => {
    //TODO IMPLEMENT
    // store favicon in browser state using origin as key
  };
  const getFaviconFromCache = async (originUrl: string) => {
    //TODO IMPLEMENT
    // fetch favicon from browser state using origin as key
    return null;
  };

  useEffect(() => {
    (async () => {
      const cachedFaviconUrl = await getFaviconFromCache(origin);
      if (cachedFaviconUrl) {
        setFaviconURI({ uri: cachedFaviconUrl });
      } else {
        const fetchedFaviconUrl = await getFaviconURLFromHtml(origin);
        await cacheFavicon(origin, fetchedFaviconUrl);
        setFaviconURI({ uri: fetchedFaviconUrl });
      }
    })();
  });

  return faviconURI;
};

export default useFavicon;
