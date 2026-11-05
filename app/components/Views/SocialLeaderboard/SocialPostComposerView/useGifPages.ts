import { useCallback, useEffect, useRef, useState } from 'react';
import I18n from '../../../../../locales/i18n';
import { type FetchGifPageParams, type Gif, type GifPage } from './gifPage';

const SEARCH_DEBOUNCE_MS = 300;

export interface UseGifPagesResult<TCode extends string> {
  gifs: Gif[];
  isLoading: boolean;
  error: TCode | null;
  loadMore: () => void;
  retry: () => void;
}

const mergeGifs = (current: Gif[], next: Gif[]): Gif[] => {
  const seen = new Set<string>();
  return [...current, ...next].filter((gif) => {
    if (seen.has(gif.id)) {
      return false;
    }
    seen.add(gif.id);
    return true;
  });
};

export const useGifPages = <TCode extends string>(
  query: string,
  enabled: boolean,
  fetchPage: (params: FetchGifPageParams) => Promise<GifPage>,
  toErrorCode: (caught: unknown) => TCode,
): UseGifPagesResult<TCode> => {
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<TCode | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const pageRef = useRef(1);
  const requestRef = useRef(0);
  const queryRef = useRef(query);
  const fetchPageRef = useRef(fetchPage);
  const toErrorCodeRef = useRef(toErrorCode);
  queryRef.current = query;
  fetchPageRef.current = fetchPage;
  toErrorCodeRef.current = toErrorCode;

  const loadPage = useCallback(async (page: number, append: boolean) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const result = await fetchPageRef.current({
        query: queryRef.current,
        page,
        locale: I18n.locale,
      });
      if (requestId !== requestRef.current) {
        return;
      }
      setGifs((current) =>
        append ? mergeGifs(current, result.gifs) : result.gifs,
      );
      setHasNext(result.hasNext);
      pageRef.current = page;
    } catch (caught) {
      if (requestId !== requestRef.current) {
        return;
      }
      if (!append) {
        setGifs([]);
      }
      setHasNext(false);
      setError(toErrorCodeRef.current(caught));
    } finally {
      if (requestId === requestRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    pageRef.current = 1;
    setHasNext(false);
    const delay = query.trim() ? SEARCH_DEBOUNCE_MS : 0;
    const handle = setTimeout(() => {
      loadPage(1, false).catch(() => undefined);
    }, delay);
    return () => {
      clearTimeout(handle);
    };
  }, [enabled, loadPage, query]);

  useEffect(
    () => () => {
      requestRef.current += 1;
    },
    [],
  );

  const loadMore = useCallback(() => {
    if (!hasNext || isLoading || isLoadingMore) {
      return;
    }
    loadPage(pageRef.current + 1, true).catch(() => undefined);
  }, [hasNext, isLoading, isLoadingMore, loadPage]);

  const retry = useCallback(() => {
    loadPage(1, false).catch(() => undefined);
  }, [loadPage]);

  return { gifs, isLoading, error, loadMore, retry };
};
