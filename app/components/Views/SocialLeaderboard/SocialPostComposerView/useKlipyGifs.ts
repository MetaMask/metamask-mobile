import {
  fetchKlipyGifs,
  KlipyApiError,
  type KlipyApiErrorCode,
  type KlipyGif,
} from './klipyClient';
import { useGifPages } from './useGifPages';

export interface UseKlipyGifsResult {
  gifs: KlipyGif[];
  isLoading: boolean;
  error: KlipyApiErrorCode | null;
  loadMore: () => void;
  retry: () => void;
}

export const useKlipyGifs = (
  query: string,
  enabled: boolean,
): UseKlipyGifsResult =>
  useGifPages(query, enabled, fetchKlipyGifs, (caught) =>
    caught instanceof KlipyApiError ? caught.code : 'request_failed',
  );
