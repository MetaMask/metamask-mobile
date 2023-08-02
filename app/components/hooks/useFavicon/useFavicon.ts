import RNFetchBlob, { FetchBlobResponse } from 'rn-fetch-blob';
import { DOMParser } from 'xmldom';
import { useEffect, useState } from 'react';
import { ImageSourcePropType } from 'react-native';
import { logger } from 'ethers';
import { forEach } from 'lodash';

const useFavicon = (origin: string) => {
  const [faviconURI, setFaviconURI] = useState<ImageSourcePropType>({});

  const fetchHtmlSource = async (url: string) =>
    RNFetchBlob.config({ fileCache: true })
      .fetch('GET', url)
      .then((response: FetchBlobResponse) => response.text())
      .catch(() => {
        logger.warn('useFavicon fetchHtmlSource failed', url);
        return null;
      });

  const parseHtmlSource = async (htmlSource: string) =>
    // use a return statement for the error handler to avoid the console warning
    // as any error will result in fallback favicon
    new DOMParser({
      errorHandler: (level, msg) => logger.debug(level, msg),
    }).parseFromString(htmlSource, 'text/html');

  useEffect(() => {
    (async () => {
      if (!/^http(s)?:\/\/.+/gi.test(origin)) {
        // TODO if origin doesn't start with http(s)://
        // then it's probably an already registered origin
        // we should probably just return the cached favicon
        // using the origin as key
        logger.debug('useFavicon useEffect origin without scheme', origin);
      }
      const htmlSource = await fetchHtmlSource(origin);
      if (!htmlSource) {
        return;
      }
      const htmlDoc = await parseHtmlSource(htmlSource);
      if (!htmlDoc) {
        return;
      }
      const links = await htmlDoc.getElementsByTagName('link');
      // use lodash forEach as the collection require iteration to prevent named items to be returned
      forEach(links, (link) => {
        const rel = link.getAttribute('rel');
        if (rel && (rel === 'shortcut icon' || rel === 'icon')) {
          const href = link.getAttribute('href');
          if (href && href !== '') {
            const faviconURL = new URL(href, origin);
            setFaviconURI({ uri: faviconURL.toString() });
            return false; //stop at first favicon found, same behaviour as browser extension
          }
        }
      });
    })();
  }, [origin]);

  return faviconURI;
};

export default useFavicon;
