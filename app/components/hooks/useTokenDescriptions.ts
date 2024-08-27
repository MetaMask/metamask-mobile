import { Hex } from '@metamask/utils';
import { getDecimalChainId } from '../../util/networks';
import { useState, useEffect } from 'react';

export interface TokenDescriptions {
  en: string;
  de: string;
  es: string;
  fr: string;
  it: string;
  pl: string;
  ro: string;
  hu: string;
  nl: string;
  pt: string;
  sv: string;
  vi: string;
  tr: string;
  ru: string;
  ja: string;
  zh: string;
  'zh-tw': string;
  ko: string;
  ar: string;
  th: string;
  id: string;
  cs: string;
  da: string;
  el: string;
  hi: string;
  no: string;
  sk: string;
  uk: string;
  he: string;
  fi: string;
  bg: string;
  hr: string;
  lt: string;
  sl: string;
}

const useTokenDescriptions = ({
  address,
  chainId,
}: {
  address: string;
  chainId: Hex;
}): {
  data: TokenDescriptions | Record<string, never>;
  isLoading: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
} => {
  const [data, setData] = useState<TokenDescriptions | Record<string, never>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  useEffect(() => {
    const fetchPrices = async () => {
      setIsLoading(true);
      try {
        const baseUri = `https://token.api.cx.metamask.io`;
        const uri = new URL(
          `${baseUri}/token/${getDecimalChainId(chainId)}/description`,
        );
        uri.searchParams.set('address', address);

        const response = await fetch(uri.toString());
        const json = await response.json();
        setData(json);
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrices();
  }, [address, chainId]);

  return { data, isLoading, error };
};

export default useTokenDescriptions;
