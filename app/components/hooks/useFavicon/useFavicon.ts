import RNFetchBlob, { FetchBlobResponse } from 'rn-fetch-blob';
import { DOMParser } from 'xmldom';
import { useCallback, useEffect, useState } from 'react';
import { ImageSourcePropType } from 'react-native';
import { forEach } from 'lodash';
import Logger from '../../../util/Logger';

//Empty value uset to trigger fallback favicon in the UI and prevent use of undefined
const EMPTY_FAVICON_URI = {};

const useFavicon = (origin: string) => {
  const [faviconURI, setFaviconURI] =
    useState<ImageSourcePropType>(EMPTY_FAVICON_URI);

  const fetchHtmlSource = useCallback(
    async (url: string) =>
      RNFetchBlob.config({ fileCache: true })
        .fetch('GET', url)
        .then((response: FetchBlobResponse) => response.text())
        .catch(() => {
          Logger.log('useFavicon fetchHtmlSource failed', url);
        }),
    [],
  );

  const parseHtmlSource = useCallback(
    async (htmlSource: string) =>
      // use a return statement for the error handler to avoid the console warning
      // as any error will result in fallback favicon
      new DOMParser({
        errorHandler: (level, msg) => {
          if (level === 'error') Logger.log(level, msg);
        },
      }).parseFromString(htmlSource, 'text/html'),
    [],
  );

  const getFaviconUriFromLinks = useCallback(
    (links: HTMLCollectionOf<Element>) => {
      // use lodash forEach as the collection require iteration to prevent named items to be returned
      let uri = EMPTY_FAVICON_URI;
      forEach(links, (link) => {
        const rel = link.getAttribute('rel');
        if (rel && (rel === 'shortcut icon' || rel === 'icon')) {
          const href = link.getAttribute('href');
          if (href && href !== '') {
            const faviconURL = new URL(href, origin);
            uri = { uri: faviconURL.toString() };
            return false; //stop at first favicon found, same behaviour as browser extension
          }
        }
      });

      return uri;
    },
    [origin],
  );

  useEffect(() => {
    (async () => {
      if (!/^http(s)?:\/\/.+/gi.test(origin)) {
        // TODO if origin doesn't start with http(s)://
        // then it's probably an already registered origin
        // we should probably just return the cached favicon
        // using the origin as key
        await Logger.log('useFavicon useEffect origin without scheme', origin);
      }

      fetchHtmlSource(origin)
        .then((htmlSource) => parseHtmlSource(htmlSource))
        .then((htmlDoc) => htmlDoc.getElementsByTagName('link'))
        .then((links) => getFaviconUriFromLinks(links))
        .then((uri) => setFaviconURI(uri));
    })();
  }, [origin, fetchHtmlSource, parseHtmlSource, getFaviconUriFromLinks]);

  return faviconURI;
};

export default useFavicon;
