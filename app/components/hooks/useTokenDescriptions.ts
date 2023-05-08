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
  chainId: string;
}): {
  data: TokenDescriptions | Record<string, never>;
  isLoading: boolean;
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
        const baseUri = `https://token-api.metaswap.codefi.network`;
        const uri = new URL(`${baseUri}/token/${chainId}/description`);
        uri.searchParams.set('address', address);

        const response = await fetch(uri.toString());
        const json = await response.json();
        setData(json);
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
