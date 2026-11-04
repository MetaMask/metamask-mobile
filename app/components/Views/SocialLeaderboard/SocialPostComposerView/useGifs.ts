import { useCallback, useEffect, useRef, useState } from 'react';
import I18n from '../../../../../locales/i18n';
import {
  fetchGifs,
  GifApiError,
  type Gif,
  type GifApiErrorCode,
} from './gifClient';

const SEARCH_DEBOUNCE_MS = 300;

export interface UseGifsResult {
  gifs: Gif[];
  isLoading: boolean;
  error: GifApiErrorCode | null;
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

export const useGifs = (query: string, enabled: boolean): UseGifsResult => {
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<GifApiErrorCode | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const pageRef = useRef(1);
  const requestRef = useRef(0);
  const queryRef = useRef(query);
  queryRef.current = query;

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
      const result = await fetchGifs({
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
      setError(caught instanceof GifApiError ? caught.code : 'request_failed');
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
