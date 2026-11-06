import { fetchGifs, GifApiError, type GifApiErrorCode } from './gifClient';
import { type Gif } from './gifPage';
import { useGifPages } from './useGifPages';

export interface UseGifsResult {
  gifs: Gif[];
  isLoading: boolean;
  error: GifApiErrorCode | null;
  loadMore: () => void;
  retry: () => void;
}

export const useGifs = (query: string, enabled: boolean): UseGifsResult =>
  useGifPages(query, enabled, fetchGifs, (caught) =>
    caught instanceof GifApiError ? caught.code : 'request_failed',
  );
