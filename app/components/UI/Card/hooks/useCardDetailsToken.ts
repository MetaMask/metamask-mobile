import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import { CardDetailsTokenResponse, CardType } from '../types';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';

// Hex colors required by the external card details API
/* eslint-disable @metamask/design-tokens/color-no-hex */
const CARD_DETAILS_CSS = {
  [CardType.VIRTUAL]: {
    cardBackgroundColor: '#FF5C16',
    cardTextColor: '#FFFFFF',
    panBackgroundColor: '#EFEFEF',
    panTextColor: '#000000',
  },
  [CardType.PHYSICAL]: {
    cardBackgroundColor: '#3D065F',
    cardTextColor: '#FFFFFF',
    panBackgroundColor: '#EFEFEF',
    panTextColor: '#000000',
  },
  [CardType.METAL]: {
    cardBackgroundColor: '#3D065F',
    cardTextColor: '#FFFFFF',
    panBackgroundColor: '#EFEFEF',
    panTextColor: '#000000',
  },
};

interface UseCardDetailsTokenResult {
  /** Fetches a new card details token and returns the image URL */
  fetchCardDetailsToken: (
    cardType?: CardType,
  ) => Promise<CardDetailsTokenResponse | null>;
  /** Whether the fetch is in progress */
  isLoading: boolean;
  /** Whether the image is still loading after URL is received */
  isImageLoading: boolean;
  /** Callback to be called when the image finishes loading */
  onImageLoad: () => void;
  /** Error from the last fetch attempt */
  error: Error | null;
  /** The image URL from the last successful fetch */
  imageUrl: string | null;
  /** Clears the current image URL */
  clearImageUrl: () => void;
}

/**
 * Hook to generate a secure token for displaying sensitive card details as an image.
 * The token is time-limited (~10 minutes) and single-use.
 *
 * @returns Object containing fetchCardDetailsToken function, loading state, error, and imageUrl
 */
const useCardDetailsToken = (): UseCardDetailsTokenResult => {
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const { sdk } = useCardSDK();

  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const fetchCardDetailsToken = useCallback(
    async (
      cardType: CardType = CardType.VIRTUAL,
    ): Promise<CardDetailsTokenResponse | null> => {
      if (!sdk || !isAuthenticated) {
        return null;
      }

      setIsLoading(true);
      setIsImageLoading(true);
      setError(null);

      try {
        const customCss = CARD_DETAILS_CSS[cardType];
        const response = await sdk.generateCardDetailsToken({ customCss });
        setImageUrl(response.imageUrl);
        return response;
      } catch (err) {
        setIsImageLoading(false);
        const fetchError =
          err instanceof Error ? err : new Error('Unknown error occurred');
        setError(fetchError);
        throw fetchError;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk, isAuthenticated],
  );

  const onImageLoad = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  const clearImageUrl = useCallback(() => {
    setImageUrl(null);
    setError(null);
    setIsImageLoading(false);
  }, []);

  return {
    fetchCardDetailsToken,
    isLoading,
    isImageLoading,
    onImageLoad,
    error,
    imageUrl,
    clearImageUrl,
  };
};

export default useCardDetailsToken;
