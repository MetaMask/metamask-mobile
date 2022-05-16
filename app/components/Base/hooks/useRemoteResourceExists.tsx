import { useState, useEffect } from 'react';

/**
 * @typedef {Boolean} resourceExists boolean value that represent wether the remote resource exists or not
 * @typedef {Boolean} isLoading boolean value that indicates when the promise is completed
 */

/**
 * Hook to handle the remote state of a resource
 * @param {String} uri Resource URI
 * @return {Boolean[]} `[resourceExists, isLoading]`
 */
const useRemoteResourceExists = (uri: string): boolean[] => {
  const [resourceExists, setResourceExists] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStatus = async (innerUri: string): Promise<void> => {
    fetch(innerUri, { method: 'HEAD' })
      .then((res) => setResourceExists(res.status === 200))
      .catch(() => setResourceExists(false))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchStatus(uri);
  }, [uri]);

  return [resourceExists, isLoading];
};

export default useRemoteResourceExists;
