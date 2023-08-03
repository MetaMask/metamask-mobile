import RNFetchBlob, { FetchBlobResponse } from 'rn-fetch-blob';
import { DOMParser } from 'xmldom';
import { useCallback, useEffect, useState } from 'react';
import { ImageSourcePropType } from 'react-native';
import { forEach } from 'lodash';
import Logger from '../../../util/Logger';
import { lookup } from 'react-native-mime-types';

//Empty value uset to trigger fallback favicon in the UI and prevent use of undefined
const EMPTY_FAVICON_URI = {};

const useFavicon = (origin: string) => {
  const [faviconURI, setFaviconURI] =
    useState<ImageSourcePropType>(EMPTY_FAVICON_URI);

  const fetchHtmlSource = async (url: string) =>
    RNFetchBlob.fetch('GET', url)
      .then((response: FetchBlobResponse) => response.text())
      .catch(() => {
        Logger.log('useFavicon fetchHtmlSource failed', url);
      });

  const parseHtmlSource = async (htmlSource: string) =>
    // use a return statement for the error handler to avoid the console warning
    // as any error will result in fallback favicon
    new DOMParser({
      errorHandler: (level, msg) => {
        if (level === 'error') Logger.log(level, msg);
      },
    }).parseFromString(htmlSource, 'text/html');

  const getFaviconUrlFromLinks = useCallback(
    (links: HTMLCollectionOf<Element>) => {
      let faviconURL = {};
      // use lodash forEach as the collection require iteration to prevent named items to be returned
      forEach(links, (link) => {
        const rel = link.getAttribute('rel');
        if (rel && (rel === 'shortcut icon' || rel === 'icon')) {
          const href = link.getAttribute('href');
          if (href && href !== '') {
            faviconURL = new URL(href, origin);
            return false; //stop loop at first favicon found, same behaviour as browser extension
          }
        }
      });
      return faviconURL.toString();
    },
    [origin],
  );

  const getFileExtension = (url: string) => url.split('.').pop();

  const cacheFavicon = useCallback(async (url: string) => {
    const response = await RNFetchBlob.config({
      fileCache: true,
      appendExt: getFileExtension(url),
    }).fetch('GET', url);
    //TODO store favicon cache path in redux for this specific encodedFaviconUrl
    // use a base64 encoded favicon url as cache key
    // const faviconOriginUrl = new URL(origin);
    // const encodedFaviconUrl = encodeURIComponent(
    //   faviconOriginUrl.host + faviconOriginUrl.pathname,
    // );
    return response.path();
  }, []);

  const fetchAndCacheFavicon = useCallback(() => {
    // this part fetches the favicon from the origin and caches it and returns the cached data as base64 encoded URI
    fetchHtmlSource(origin)
      .then((htmlSource) => parseHtmlSource(htmlSource))
      .then((htmlDoc) => htmlDoc.getElementsByTagName('link'))
      .then((links) => getFaviconUrlFromLinks(links))
      .then((faviconUrl) => cacheFavicon(faviconUrl))
      .then((path) => {
        const mimeType = lookup(getFileExtension(path));
        return RNFetchBlob.fs
          .readFile(path, 'base64')
          .then((data) => ({ uri: `data:${mimeType};base64,${data}` }));
      })
      .then((uri) => {
        //DEBUG
        console.debug('uri', uri);
        setFaviconURI(uri);
      });
  }, [origin, cacheFavicon, getFaviconUrlFromLinks]);

  useEffect(() => {
    (async () => {
      if (!/^http(s)?:\/\/.+/gi.test(origin)) {
        //TODO if origin doesn't start with http(s)://
        // then it's probably an already registered origin
        // we should probably just return the cached favicon
        // using the origin as key
        await Logger.log('useFavicon useEffect origin without scheme', origin);
      }

      //TODO check if favicon is already cached for this origin
      // (cache key should be the origin and point to the cached favicon path)
      // if so, return it and skip the rest of the function
      // if favicon is not cached, fetch it and cache it
      // then return the cached favicon
      fetchAndCacheFavicon();
    })();
  }, [origin, fetchAndCacheFavicon]);

  return faviconURI;
};

export default useFavicon;
