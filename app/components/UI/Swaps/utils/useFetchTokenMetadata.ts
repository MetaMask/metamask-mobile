import { useEffect, useState } from 'react';
import axios, { CancelTokenSource } from 'axios';
import { swapsUtils } from '@metamask/swaps-controller';
import { Hex } from '@metamask/utils';

interface TokenMetadata {
  valid: boolean | null;
  error: boolean;
  // TODO: once we have info about how metadata is used, or how it's prepared upstream (network request), add better types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: unknown | null;
}

const defaultTokenMetadata: TokenMetadata = {
  valid: null,
  error: false,
  metadata: null,
};

function useFetchTokenMetadata(
  address: string,
  chainId: Hex,
): [boolean, TokenMetadata] {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tokenMetadata, setTokenMetadata] =
    useState<TokenMetadata>(defaultTokenMetadata);

  useEffect(() => {
    if (!address) {
      return;
    }

    let cancelTokenSource: CancelTokenSource | undefined;
    async function fetchTokenMetadata() {
      try {
        cancelTokenSource = axios.CancelToken.source();
        setTokenMetadata(defaultTokenMetadata);
        setIsLoading(true);
        const { data } = await axios.request({
          url: swapsUtils.getTokenMetadataURL(chainId),
          params: {
            address,
          },
          cancelToken: cancelTokenSource.token,
        });
        setTokenMetadata({ error: false, valid: true, metadata: data });
      } catch (error: unknown) {
        // Address is not an ERC20
        // TODO: suggested replacement if (axios.isAxiosError(error) && error.response?.status === 422) {
        // @ts-expect-error js-ts migration follow-up
        if (error?.response?.status === 422) {
          setTokenMetadata({ error: false, valid: false, metadata: null });
        } else {
          setTokenMetadata({ ...defaultTokenMetadata, error: true });
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchTokenMetadata();

    return () => {
      cancelTokenSource?.cancel();
      setIsLoading(false);
      setTokenMetadata(defaultTokenMetadata);
    };
  }, [address, chainId]);

  return [isLoading, tokenMetadata];
}

export default useFetchTokenMetadata;
